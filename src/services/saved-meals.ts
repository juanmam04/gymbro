import { supabase } from '@/lib/supabase';
import type { EditableFoodItem } from '@/types/nutrition';
import type { MealType, SavedMeal, SavedMealItem } from '@/types/database';

export async function fetchSavedMeals(userId: string): Promise<SavedMeal[]> {
  const { data, error } = await supabase
    .from('saved_meals')
    .select('*, saved_meal_items (*)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as SavedMeal[];
}

export async function createSavedMeal(input: {
  userId: string;
  name: string;
  mealType: MealType;
  imageUrl?: string | null;
  items: EditableFoodItem[];
}): Promise<SavedMeal> {
  const totals = input.items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const { data: saved, error } = await supabase
    .from('saved_meals')
    .insert({
      user_id: input.userId,
      name: input.name.trim(),
      meal_type: input.mealType,
      image_url: input.imageUrl ?? null,
      total_calories: totals.calories,
      total_protein: totals.protein,
      total_carbs: totals.carbs,
      total_fat: totals.fat,
    })
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!saved) throw new Error('No se pudo guardar la comida');

  if (input.items.length > 0) {
    const { error: itemsError } = await supabase.from('saved_meal_items').insert(
      input.items.map((item) => ({
        saved_meal_id: saved.id,
        food_name: item.name,
        quantity: item.grams,
        unit: 'g',
        grams: item.grams,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      })),
    );
    if (itemsError) throw itemsError;
  }

  return saved;
}

export async function deleteSavedMeal(id: string, userId: string): Promise<void> {
  const { error } = await supabase.from('saved_meals').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export function savedItemsToEditable(items: SavedMealItem[]): EditableFoodItem[] {
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
      confidence: null,
      source: 'manual' as const,
      perGram: {
        calories: Number(item.calories) / grams,
        protein: Number(item.protein) / grams,
        carbs: Number(item.carbs) / grams,
        fat: Number(item.fat) / grams,
      },
    };
  });
}
