import { supabase } from '@/lib/supabase';
import type { GoalType, NutritionGoals, PartnerConnection, PartnerInvite, Profile } from '@/types/database';

export async function getNutritionGoals(userId: string): Promise<NutritionGoals | null> {
  const { data, error } = await supabase
    .from('nutrition_goals')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertNutritionGoals(input: {
  userId: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goalType: GoalType;
}): Promise<NutritionGoals> {
  const { data, error } = await supabase
    .from('nutrition_goals')
    .upsert(
      {
        user_id: input.userId,
        calories_target: input.calories,
        protein_target: input.protein,
        carbs_target: input.carbs,
        fat_target: input.fat,
        goal_type: input.goalType,
      },
      { onConflict: 'user_id' },
    )
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No se pudieron guardar los objetivos');
  return data;
}

export async function getAcceptedPartner(userId: string): Promise<{
  connection: PartnerConnection;
  partner: Profile;
} | null> {
  const { data: connection, error } = await supabase
    .from('partner_connections')
    .select('*')
    .eq('status', 'accepted')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .maybeSingle();

  if (error) throw error;
  if (!connection) return null;

  const partnerId =
    connection.user_a_id === userId ? connection.user_b_id : connection.user_a_id;

  const { data: partner, error: partnerError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', partnerId)
    .single();

  if (partnerError) throw partnerError;

  return { connection, partner };
}

export async function createPartnerInvite(): Promise<PartnerInvite> {
  const { data, error } = await supabase.rpc('create_partner_invite');
  if (error) throw error;
  return data as PartnerInvite;
}

export async function acceptPartnerInvite(code: string): Promise<PartnerConnection> {
  const { data, error } = await supabase.rpc('accept_partner_invite', {
    p_code: code,
  });
  if (error) throw error;
  return data as PartnerConnection;
}

export async function getActiveInvite(userId: string): Promise<PartnerInvite | null> {
  const { data, error } = await supabase
    .from('partner_invites')
    .select('*')
    .eq('inviter_id', userId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
