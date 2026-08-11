import type {
  ConfidenceBand,
  NutritionPer100g,
  ScanClarification,
  ScannedFood,
} from '@/types/nutrition';

export function calculateNutritionForGrams(
  per100g: NutritionPer100g,
  grams: number,
): NutritionPer100g {
  const factor = Math.max(grams, 0) / 100;
  return {
    calories: per100g.calories * factor,
    protein: per100g.protein * factor,
    carbs: per100g.carbs * factor,
    fat: per100g.fat * factor,
  };
}

/**
 * Deterministic confidence banding for UX.
 * Combines vision, portion and nutrition-match scores (each 0–1).
 */
export function computeConfidenceBand(input: {
  vision?: number | null;
  portion?: number | null;
  nutritionMatch?: number | null;
}): ConfidenceBand {
  const scores = [input.vision, input.portion, input.nutritionMatch].filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  );
  if (scores.length === 0) return 'medium';
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const min = Math.min(...scores);
  if (min < 0.45 || avg < 0.55) return 'low';
  if (min < 0.7 || avg < 0.75) return 'medium';
  return 'high';
}

export function bandLabel(band: ConfidenceBand): string | null {
  if (band === 'medium') return 'Revisá la cantidad';
  if (band === 'low') return 'Confirmá antes de registrar';
  return null;
}

export function enrichScannedFoodConfidence(food: ScannedFood): ScannedFood {
  const band = computeConfidenceBand({
    vision: food.visionConfidence ?? food.confidence,
    portion: food.portionConfidence ?? food.portion?.confidence,
    nutritionMatch: food.nutritionMatchConfidence,
  });
  return { ...food, confidenceBand: band };
}

/**
 * Pick at most 2 high-impact clarifications from hidden ingredients / low confidence.
 */
export function selectClarifications(input: {
  hidden?: { name: string; reason: string; confidence: number }[];
  foods: ScannedFood[];
}): ScanClarification[] {
  const out: ScanClarification[] = [];

  const oil = input.hidden?.find((h) => /aceite|oil|manteca|butter|mayo|aderezo|dressing/i.test(h.name));
  if (oil && oil.confidence >= 0.25 && oil.confidence < 0.75) {
    out.push({
      id: 'oil_fat',
      question: '¿Había aceite o grasa al cocinar?',
      reason: oil.reason,
      options: [
        { id: 'none', label: 'No', calorieDeltaHint: 0 },
        { id: 'little', label: 'Un poco', calorieDeltaHint: 40 },
        { id: 'yes', label: 'Sí', calorieDeltaHint: 90 },
      ],
    });
  }

  const milkIdx = input.foods.findIndex((f) => /leche|milk|yogur|latte/i.test(f.name));
  if (milkIdx >= 0 && (input.foods[milkIdx]?.confidenceBand === 'low' || input.foods[milkIdx]?.confidenceBand === 'medium')) {
    out.push({
      id: 'milk_type',
      question: '¿Qué tipo de leche es?',
      reason: 'Cambia calorías y grasa de forma relevante',
      relatedFoodIndex: milkIdx,
      options: [
        { id: 'skim', label: 'Descremada', calorieDeltaHint: -20 },
        { id: 'whole', label: 'Entera', calorieDeltaHint: 20 },
        { id: 'plant', label: 'Vegetal', calorieDeltaHint: 0 },
        { id: 'unknown', label: 'No sé', calorieDeltaHint: 0 },
      ],
    });
  }

  return out.slice(0, 2);
}

/** Apply clarification answers by adjusting fat/calories of the meal heuristically. */
export function applyClarificationToFoods(
  foods: ScannedFood[],
  answers: Record<string, string>,
): ScannedFood[] {
  let next = foods.map((f) => ({ ...f }));

  const oil = answers.oil_fat;
  if (oil === 'little' || oil === 'yes') {
    const addFat = oil === 'yes' ? 10 : 4;
    const addKcal = addFat * 9;
    next = [
      ...next,
      {
        name: 'Aceite / grasa de cocción',
        displayName: 'Aceite / grasa de cocción',
        estimatedGrams: addFat,
        calories: addKcal,
        protein: 0,
        carbs: 0,
        fat: addFat,
        confidence: 0.5,
        confidenceBand: 'medium',
        visible: false,
        nutritionPer100g: { calories: 900, protein: 0, carbs: 0, fat: 100 },
      },
    ];
  }

  const milk = answers.milk_type;
  if (milk && milk !== 'unknown') {
    next = next.map((f) => {
      if (!/leche|milk|yogur|latte/i.test(f.name)) return f;
      const per100 =
        milk === 'skim'
          ? { calories: 35, protein: 3.4, carbs: 5, fat: 0.1 }
          : milk === 'whole'
            ? { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 }
            : { calories: 40, protein: 1, carbs: 5, fat: 1.5 };
      const macros = calculateNutritionForGrams(per100, f.estimatedGrams);
      return {
        ...f,
        ...macros,
        nutritionPer100g: per100,
        nutritionMatchConfidence: 0.8,
        confidenceBand: computeConfidenceBand({
          vision: f.visionConfidence ?? f.confidence,
          portion: f.portionConfidence,
          nutritionMatch: 0.8,
        }),
      };
    });
  }

  return next;
}
