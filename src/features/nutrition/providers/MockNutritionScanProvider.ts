import type { ScanResult, NutritionScanProvider } from '@/types/nutrition';
import { sumTotals } from '@/utils/nutrition';
import {
  calculateNutritionForGrams,
  enrichScannedFoodConfidence,
  selectClarifications,
} from '@/features/nutrition/services/nutritionMath';
import { matchFoodNutrition } from '@/features/nutrition/providers/FoodNutritionProviders';

/**
 * Mock provider for development/tests. Never use as a silent production fake
 * when the user expects a real scan — feature flag selects the active provider.
 */
export class MockNutritionScanProvider implements NutritionScanProvider {
  readonly name = 'mock';

  async scanFood(_imageUri: string): Promise<ScanResult> {
    await delay(1200);

    const raw = [
      {
        name: 'Pechuga de pollo',
        displayName: 'Pechuga de pollo',
        normalizedQuery: 'chicken breast cooked',
        estimatedGrams: 180,
        visionConfidence: 0.91,
        portionConfidence: 0.8,
      },
      {
        name: 'Arroz blanco',
        displayName: 'Arroz blanco',
        normalizedQuery: 'white rice cooked',
        estimatedGrams: 200,
        visionConfidence: 0.87,
        portionConfidence: 0.75,
      },
      {
        name: 'Palta',
        displayName: 'Palta',
        normalizedQuery: 'avocado',
        estimatedGrams: 60,
        visionConfidence: 0.82,
        portionConfidence: 0.7,
      },
    ];

    const foods = raw.map((item) => {
      const match = matchFoodNutrition(item.normalizedQuery);
      const per100 = match?.hit.per100g ?? { calories: 150, protein: 10, carbs: 15, fat: 5 };
      const macros = calculateNutritionForGrams(per100, item.estimatedGrams);
      return enrichScannedFoodConfidence({
        ...item,
        ...macros,
        confidence: item.visionConfidence,
        nutritionMatchConfidence: match?.confidence ?? 0.4,
        nutritionPer100g: per100,
        nutritionProvider: match?.hit.source,
        nutritionFoodId: match?.hit.id,
        aiEstimatedGrams: item.estimatedGrams,
        portion: {
          value: item.estimatedGrams,
          unit: 'g',
          confidence: item.portionConfidence,
          method: 'vision_estimate',
        },
        visible: true,
      });
    });

    const clarifications = selectClarifications({
      foods,
      hidden: [
        {
          name: 'aceite',
          reason: 'el pollo parece cocinado con materia grasa',
          confidence: 0.35,
        },
      ],
    });

    return {
      foods,
      totals: sumTotals(foods),
      provider: this.name,
      analyzedAt: new Date().toISOString(),
      dishName: 'Pollo con arroz y palta',
      overallConfidence: 0.84,
      overallConfidenceBand: 'high',
      clarifications,
      possibleHiddenIngredients: [
        { name: 'aceite', reason: 'posible grasa de cocción', confidence: 0.35 },
      ],
      visionProvider: 'mock',
      nutritionProvider: 'curated-latam',
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
