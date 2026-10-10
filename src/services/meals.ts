import { supabase } from '@/lib/supabase';
import type { EditableFoodItem } from '@/types/nutrition';
import type {
  Meal,
  MealComment,
  MealItem,
  MealReaction,
  MealReactionType,
  MealType,
  MealWithDetails,
} from '@/types/database';
import { dayKey } from '@/features/streaks/calculateStreaks';
import { inferMealType } from '@/utils/nutrition';

export async function uploadMealImage(userId: string, localUri: string): Promise<string> {
  const extension = localUri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
  const safeExt = extension === 'jpeg' ? 'jpg' : extension;
  const mimeType =
    safeExt === 'png'
      ? 'image/png'
      : safeExt === 'webp'
        ? 'image/webp'
        : safeExt === 'heic'
          ? 'image/heic'
          : 'image/jpeg';

  const path = `${userId}/${Date.now()}.${safeExt}`;
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage.from('meal-images').upload(path, arrayBuffer, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('meal-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const path = `${userId}/avatar-${Date.now()}.jpg`;
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  const { error } = await supabase.storage.from('avatars').upload(path, arrayBuffer, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

export async function createMeal(input: {
  userId: string;
  imageUrl?: string | null;
  items: EditableFoodItem[];
  mealType?: MealType;
  eatenAt?: string;
  sharedWithPartner?: boolean;
  sharedGroupId?: string | null;
  scanStatus?: Meal['scan_status'];
}): Promise<Meal> {
  const { data, error } = await supabase.rpc('save_racha_meal', {
    p_items: input.items,
    p_meal_type: input.mealType ?? inferMealType(),
    p_eaten_at: input.eatenAt ?? new Date().toISOString(),
    p_image_url: input.imageUrl ?? null,
    p_shared_with_partner: input.sharedWithPartner ?? false,
    p_shared_group_id: input.sharedGroupId ?? null,
    p_scan_status: input.scanStatus ?? 'edited',
  });
  if (error) throw error;
  if (!data) throw new Error('No se pudo registrar la comida');
  return data as Meal;
}

const MEAL_SELECT = `
  *,
  profile:profiles!meals_user_id_fkey (
    id, display_name, avatar_url, share_calories, share_macros, share_meals
  ),
  meal_items (*),
  meal_reactions (*),
  meal_comments (id)
`;

export async function fetchFeed(userIds: string[]): Promise<MealWithDetails[]> {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from('meals')
    .select(MEAL_SELECT)
    .in('user_id', userIds)
    .order('eaten_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return ((data ?? []) as MealWithDetails[]).map((m) => ({
    ...m,
    comments_count: m.meal_comments?.length ?? 0,
  }));
}

export async function fetchMealById(mealId: string): Promise<MealWithDetails | null> {
  const { data, error } = await supabase
    .from('meals')
    .select(
      `
      *,
      profile:profiles!meals_user_id_fkey (
        id, display_name, avatar_url, share_calories, share_macros, share_meals
      ),
      meal_items (*),
      meal_reactions (*),
      meal_comments (
        id, meal_id, user_id, body, created_at, updated_at,
        profile:profiles!meal_comments_user_id_fkey (id, display_name, avatar_url)
      )
    `,
    )
    .eq('id', mealId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const meal = data as MealWithDetails;
  return { ...meal, comments_count: meal.meal_comments?.length ?? 0 };
}

export async function fetchMealsForDay(userId: string, dayStartIso: string, dayEndIso: string) {
  const { data, error } = await supabase
    .from('meals')
    .select(MEAL_SELECT)
    .eq('user_id', userId)
    .gte('eaten_at', dayStartIso)
    .lt('eaten_at', dayEndIso)
    .order('eaten_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as MealWithDetails[];
}

export async function fetchRecentMeals(userId: string, limit = 20): Promise<MealWithDetails[]> {
  const { data, error } = await supabase
    .from('meals')
    .select(MEAL_SELECT)
    .eq('user_id', userId)
    .order('eaten_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as MealWithDetails[];
}

export async function fetchMealsSince(userId: string, sinceIso: string): Promise<Meal[]> {
  const { data, error } = await supabase
    .from('meals')
    .select(
      'id, user_id, eaten_at, total_calories, total_protein, total_carbs, total_fat, meal_type, image_url, scan_status, notes, shared_with_partner, shared_group_id, created_at, updated_at',
    )
    .eq('user_id', userId)
    .gte('eaten_at', sinceIso)
    .order('eaten_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Meal[];
}

export async function updateMeal(input: {
  mealId: string;
  userId: string;
  mealType?: MealType;
  eatenAt?: string;
  items: EditableFoodItem[];
}): Promise<Meal> {
  const { data, error } = await supabase.rpc('save_racha_meal', {
    p_items: input.items,
    p_meal_id: input.mealId,
    p_meal_type: input.mealType ?? null,
    p_eaten_at: input.eatenAt ?? null,
  });
  if (error) throw error;
  if (!data) throw new Error('No se pudo actualizar la comida');
  return data as Meal;
}

export async function deleteMeal(mealId: string, userId: string): Promise<void> {
  // Check if image is referenced by other meals before deleting from storage
  const { data: meal } = await supabase
    .from('meals')
    .select('image_url')
    .eq('id', mealId)
    .eq('user_id', userId)
    .maybeSingle();

  const { error } = await supabase.from('meals').delete().eq('id', mealId).eq('user_id', userId);
  if (error) throw error;

  if (meal?.image_url) {
    const { count } = await supabase
      .from('meals')
      .select('id', { count: 'exact', head: true })
      .eq('image_url', meal.image_url);

    if (!count) {
      // Best-effort: extract path after bucket public URL
      try {
        const marker = '/meal-images/';
        const idx = meal.image_url.indexOf(marker);
        if (idx >= 0) {
          const path = meal.image_url.slice(idx + marker.length);
          await supabase.storage.from('meal-images').remove([path]);
        }
      } catch {
        // ignore storage cleanup failures
      }
    }
  }
}

export async function fetchTodayTotals(userId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('meals')
    .select('total_calories, total_protein, total_carbs, total_fat')
    .eq('user_id', userId)
    .gte('eaten_at', start.toISOString());

  if (error) throw error;

  return (data ?? []).reduce(
    (acc, meal) => ({
      calories: acc.calories + Number(meal.total_calories),
      protein: acc.protein + Number(meal.total_protein),
      carbs: acc.carbs + Number(meal.total_carbs),
      fat: acc.fat + Number(meal.total_fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export async function fetchWeekDailyTotals(userId: string, dayCount = 7) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (dayCount - 1));

  const { data, error } = await supabase
    .from('meals')
    .select('eaten_at, total_calories, total_protein, total_carbs, total_fat')
    .eq('user_id', userId)
    .gte('eaten_at', start.toISOString())
    .order('eaten_at', { ascending: true });

  if (error) throw error;

  const days: Record<string, { calories: number; protein: number; carbs: number; fat: number }> =
    {};
  for (let i = 0; i < dayCount; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days[dayKey(d)] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }

  for (const meal of data ?? []) {
    const key = dayKey(new Date(meal.eaten_at));
    const bucket = days[key];
    if (!bucket) continue;
    bucket.calories += Number(meal.total_calories);
    bucket.protein += Number(meal.total_protein);
    bucket.carbs += Number(meal.total_carbs);
    bucket.fat += Number(meal.total_fat);
  }

  return Object.entries(days).map(([date, totals]) => ({ date, ...totals }));
}

export async function upsertReaction(input: {
  mealId: string;
  userId: string;
  reaction: MealReactionType;
}): Promise<MealReaction> {
  const { data, error } = await supabase
    .from('meal_reactions')
    .upsert(
      {
        meal_id: input.mealId,
        user_id: input.userId,
        reaction: input.reaction,
      },
      { onConflict: 'meal_id,user_id' },
    )
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No se pudo guardar la reacción');
  return data;
}

export async function removeReaction(mealId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('meal_reactions')
    .delete()
    .eq('meal_id', mealId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function addComment(input: {
  mealId: string;
  userId: string;
  body: string;
}): Promise<MealComment> {
  const { data, error } = await supabase
    .from('meal_comments')
    .insert({
      meal_id: input.mealId,
      user_id: input.userId,
      body: input.body.trim(),
    })
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No se pudo comentar');
  return data;
}

export async function deleteComment(commentId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('meal_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);
  if (error) throw error;
}

export function mealItemsToEditable(items: MealItem[]): EditableFoodItem[] {
  return items.map((item) => {
    const grams = Math.max(Number(item.grams), 1);
    return {
      localId: item.id,
      name: item.food_name,
      grams,
      calories: Number(item.calories),
      protein: Number(item.protein),
      carbs: Number(item.carbs),
      fat: Number(item.fat),
      confidence: item.confidence,
      source: item.source === 'ai' ? 'edited' : item.source,
      perGram: {
        calories: Number(item.calories) / grams,
        protein: Number(item.protein) / grams,
        carbs: Number(item.carbs) / grams,
        fat: Number(item.fat) / grams,
      },
    };
  });
}

export type { Meal, MealItem };
