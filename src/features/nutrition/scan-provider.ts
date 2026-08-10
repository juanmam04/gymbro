import type { ScanResult, NutritionScanProvider } from '@/types/nutrition';
import { sumTotals } from '@/utils/nutrition';

/**
 * Mock provider so the full scan → edit → publish flow works without an external AI API.
 * Swap this for a real provider implementing NutritionScanProvider.
 */
export class MockNutritionScanProvider implements NutritionScanProvider {
  readonly name = 'mock';

  async scanFood(_imageUri: string): Promise<ScanResult> {
    await delay(1400);

    const foods = [
      {
        name: 'Pechuga de pollo',
        estimatedGrams: 180,
        calories: 297,
        protein: 56,
        carbs: 0,
        fat: 6.5,
        confidence: 0.91,
      },
      {
        name: 'Arroz blanco',
        estimatedGrams: 200,
        calories: 260,
        protein: 5.4,
        carbs: 56,
        fat: 0.6,
        confidence: 0.87,
      },
      {
        name: 'Palta',
        estimatedGrams: 60,
        calories: 96,
        protein: 1.2,
        carbs: 5.1,
        fat: 8.8,
        confidence: 0.82,
      },
    ];

    return {
      foods,
      totals: sumTotals(foods),
      provider: this.name,
      analyzedAt: new Date().toISOString(),
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let activeProvider: NutritionScanProvider = new MockNutritionScanProvider();

export function getNutritionScanProvider(): NutritionScanProvider {
  return activeProvider;
}

export function setNutritionScanProvider(provider: NutritionScanProvider): void {
  activeProvider = provider;
}
