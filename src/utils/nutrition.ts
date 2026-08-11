import type { EditableFoodItem, ScanResult, ScannedFood } from '@/types/nutrition';
import { calculateNutritionForGrams } from '@/features/nutrition/services/nutritionMath';

export function createLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function sumTotals(
  foods: Pick<ScannedFood, 'calories' | 'protein' | 'carbs' | 'fat'>[],
): { calories: number; protein: number; carbs: number; fat: number } {
  return foods.reduce(
    (acc, food) => ({
      calories: round1(acc.calories + food.calories),
      protein: round1(acc.protein + food.protein),
      carbs: round1(acc.carbs + food.carbs),
      fat: round1(acc.fat + food.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function scannedFoodToEditable(food: ScannedFood): EditableFoodItem {
  const grams = Math.max(food.estimatedGrams, 1);
  const per100 = food.nutritionPer100g;
  const perGram = per100
    ? {
        calories: per100.calories / 100,
        protein: per100.protein / 100,
        carbs: per100.carbs / 100,
        fat: per100.fat / 100,
      }
    : {
        calories: food.calories / grams,
        protein: food.protein / grams,
        carbs: food.carbs / grams,
        fat: food.fat / grams,
      };

  return {
    localId: createLocalId(),
    name: food.displayName || food.name,
    grams,
    calories: round1(food.calories),
    protein: round1(food.protein),
    carbs: round1(food.carbs),
    fat: round1(food.fat),
    confidence: food.confidence,
    confidenceBand: food.confidenceBand ?? null,
    source: 'ai',
    perGram,
    aiEstimatedGrams: food.aiEstimatedGrams ?? food.estimatedGrams,
    count: food.count ?? null,
    gramsPerUnit: food.gramsPerUnit ?? null,
    portionMethod: food.portion?.method ?? 'vision_estimate',
    nutritionProvider: food.nutritionProvider ?? null,
    nutritionFoodId: food.nutritionFoodId ?? null,
  };
}

export function scanResultToEditable(result: ScanResult): EditableFoodItem[] {
  return result.foods.map(scannedFoodToEditable);
}

export function recalculateItem(item: EditableFoodItem, grams: number): EditableFoodItem {
  const safeGrams = Math.max(grams, 1);
  return {
    ...item,
    grams: safeGrams,
    calories: round1(item.perGram.calories * safeGrams),
    protein: round1(item.perGram.protein * safeGrams),
    carbs: round1(item.perGram.carbs * safeGrams),
    fat: round1(item.perGram.fat * safeGrams),
    source: item.source === 'ai' || item.source === 'barcode' ? 'edited' : item.source,
    portionMethod: 'user_entered',
  };
}

export function scaleItemByFactor(item: EditableFoodItem, factor: number): EditableFoodItem {
  return recalculateItem(item, Math.max(1, item.grams * factor));
}

export function createManualFood(name: string, grams: number): EditableFoodItem {
  const per100 = { calories: 150, protein: 10, carbs: 15, fat: 5 };
  const macros = calculateNutritionForGrams(per100, grams);
  return {
    localId: createLocalId(),
    name,
    grams,
    calories: round1(macros.calories),
    protein: round1(macros.protein),
    carbs: round1(macros.carbs),
    fat: round1(macros.fat),
    confidence: null,
    confidenceBand: null,
    source: 'manual',
    perGram: {
      calories: per100.calories / 100,
      protein: per100.protein / 100,
      carbs: per100.carbs / 100,
      fat: per100.fat / 100,
    },
    portionMethod: 'user_entered',
  };
}

export function createEditableFromPer100g(input: {
  name: string;
  grams: number;
  per100g: { calories: number; protein: number; carbs: number; fat: number };
  source?: EditableFoodItem['source'];
  barcode?: string;
  nutritionProvider?: string;
  nutritionFoodId?: string;
}): EditableFoodItem {
  const macros = calculateNutritionForGrams(input.per100g, input.grams);
  return {
    localId: createLocalId(),
    name: input.name,
    grams: input.grams,
    calories: round1(macros.calories),
    protein: round1(macros.protein),
    carbs: round1(macros.carbs),
    fat: round1(macros.fat),
    confidence: 0.9,
    confidenceBand: 'high',
    source: input.source ?? 'manual',
    perGram: {
      calories: input.per100g.calories / 100,
      protein: input.per100g.protein / 100,
      carbs: input.per100g.carbs / 100,
      fat: input.per100g.fat / 100,
    },
    portionMethod: input.source === 'barcode' ? 'barcode_serving' : 'known_serving',
    barcode: input.barcode ?? null,
    nutritionProvider: input.nutritionProvider ?? null,
    nutritionFoodId: input.nutritionFoodId ?? null,
  };
}

export function inferMealType(date = new Date()): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 22) return 'dinner';
  return 'snack';
}

export function formatMacros(value: number, unit = 'g'): string {
  return `${Math.round(value)} ${unit}`;
}

export function formatKcal(value: number): string {
  return `${Math.round(value)} kcal`;
}

export function getGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}
