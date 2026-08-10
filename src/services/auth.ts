import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';
import type { LoginInput, RegisterInput } from '@/utils/validation';

export async function signInWithEmail({ email, password }: LoginInput) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail({ email, password }: RegisterInput) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  // Ensure profile row exists even if the DB trigger didn't run
  // (e.g. user created before migrations, or trigger lag).
  if (data.user) {
    await ensureProfile(data.user.id, data.user.email);
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function ensureProfile(userId: string, email?: string | null): Promise<Profile> {
  const existing = await getProfile(userId);
  if (existing) return existing;

  const fallbackName =
    (email ? email.split('@')[0] : null)?.trim() || 'Usuario';

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        display_name: fallbackName.slice(0, 50),
        onboarding_completed: false,
      },
      { onConflict: 'id' },
    )
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('No se pudo crear el perfil');
  }
  return data;
}

export async function updateProfile(
  userId: string,
  patch: Partial<
    Pick<
      Profile,
      | 'display_name'
      | 'avatar_url'
      | 'onboarding_completed'
      | 'biological_sex'
      | 'birth_year'
      | 'height_cm'
      | 'weight_kg'
      | 'activity_level'
      | 'nutrition_display_mode'
      | 'water_goal_ml'
      | 'share_meals'
      | 'share_calories'
      | 'share_macros'
      | 'share_goals'
      | 'share_weight'
      | 'notif_social'
      | 'notif_reminders'
      | 'notif_progress'
    >
  >,
): Promise<Profile> {
  await ensureProfile(userId, patch.display_name);

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No se pudo guardar el perfil');
  return data;
}
