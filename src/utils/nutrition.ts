import type { EditableFoodItem, ScanResult, ScanTotals, ScannedFood } from '@/types/nutrition';

export function createLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function sumTotals(
  foods: Pick<ScannedFood, 'calories' | 'protein' | 'carbs' | 'fat'>[],
): ScanTotals {
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
  return {
    localId: createLocalId(),
    name: food.name,
    grams,
    calories: round1(food.calories),
    protein: round1(food.protein),
    carbs: round1(food.carbs),
    fat: round1(food.fat),
    confidence: food.confidence,
    source: 'ai',
    perGram: {
      calories: food.calories / grams,
      protein: food.protein / grams,
      carbs: food.carbs / grams,
      fat: food.fat / grams,
    },
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
    source: item.source === 'ai' ? 'edited' : item.source,
  };
}

export function createManualFood(name: string, grams: number): EditableFoodItem {
  // Generic 150 kcal / 100g placeholder until user edits
  const per100 = { calories: 150, protein: 10, carbs: 15, fat: 5 };
  const factor = grams / 100;
  return {
    localId: createLocalId(),
    name,
    grams,
    calories: round1(per100.calories * factor),
    protein: round1(per100.protein * factor),
    carbs: round1(per100.carbs * factor),
    fat: round1(per100.fat * factor),
    confidence: null,
    source: 'manual',
    perGram: {
      calories: per100.calories / 100,
      protein: per100.protein / 100,
      carbs: per100.carbs / 100,
      fat: per100.fat / 100,
    },
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
  const rounded = Math.round(value);
  return `${rounded} ${unit}`;
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
