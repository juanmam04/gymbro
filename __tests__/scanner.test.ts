import { describe, expect, it } from 'vitest';
import { matchCuratedFood } from '@/features/nutrition/data/curatedFoods';
import {
  applyClarificationToFoods,
  calculateNutritionForGrams,
  computeConfidenceBand,
  selectClarifications,
} from '@/features/nutrition/services/nutritionMath';
import { MockNutritionScanProvider } from '@/features/nutrition/providers/MockNutritionScanProvider';
import { recalculateItem, scanResultToEditable, sumTotals } from '@/utils/nutrition';
import type { ScannedFood } from '@/types/nutrition';

describe('calculateNutritionForGrams', () => {
  it('scales per 100g', () => {
    const r = calculateNutritionForGrams(
      { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
      200,
    );
    expect(r.calories).toBeCloseTo(330);
    expect(r.protein).toBeCloseTo(62);
  });
});

describe('computeConfidenceBand', () => {
  it('returns high when scores are strong', () => {
    expect(computeConfidenceBand({ vision: 0.9, portion: 0.85, nutritionMatch: 0.9 })).toBe('high');
  });
  it('returns low when any score is weak', () => {
    expect(computeConfidenceBand({ vision: 0.9, portion: 0.3, nutritionMatch: 0.9 })).toBe('low');
  });
  it('returns medium for mid scores', () => {
    expect(computeConfidenceBand({ vision: 0.72, portion: 0.7, nutritionMatch: 0.7 })).toBe('medium');
  });
});

describe('curated matching', () => {
  it('matches milanesa and palta', () => {
    expect(matchCuratedFood('milanesa')?.food.displayName).toBe('Milanesa');
    expect(matchCuratedFood('palta')?.food.id).toBe('avocado');
  });
});

describe('clarifications', () => {
  it('asks about oil when hidden fat is plausible', () => {
    const foods: ScannedFood[] = [
      {
        name: 'Pollo',
        estimatedGrams: 150,
        calories: 200,
        protein: 30,
        carbs: 0,
        fat: 5,
        confidence: 0.8,
      },
    ];
    const c = selectClarifications({
      foods,
      hidden: [{ name: 'aceite', reason: 'posible grasa', confidence: 0.4 }],
    });
    expect(c.some((x) => x.id === 'oil_fat')).toBe(true);
  });

  it('applies oil clarification without inventing before answer', () => {
    const foods: ScannedFood[] = [
      {
        name: 'Pollo',
        estimatedGrams: 150,
        calories: 200,
        protein: 30,
        carbs: 0,
        fat: 5,
        confidence: 0.8,
      },
    ];
    const withOil = applyClarificationToFoods(foods, { oil_fat: 'yes' });
    expect(withOil.length).toBe(2);
    expect(withOil[1]?.name.toLowerCase()).toContain('aceite');
  });
});

describe('mock scan + editable totals', () => {
  it('returns structured foods and recalculates instantly', async () => {
    const provider = new MockNutritionScanProvider();
    const result = await provider.scanFood('file://test.jpg');
    expect(result.provider).toBe('mock');
    expect(result.foods.length).toBeGreaterThan(0);
    const items = scanResultToEditable(result);
    const edited = recalculateItem(items[0]!, items[0]!.grams * 2);
    expect(edited.calories).toBeCloseTo(items[0]!.calories * 2, 0);
    const totals = sumTotals([edited, ...items.slice(1)]);
    expect(totals.calories).toBeGreaterThan(result.totals.calories);
  });
});

describe('malformed nutrition input', () => {
  it('handles zero grams safely in recalculate', () => {
    const item = scanResultToEditable({
      foods: [
        {
          name: 'Arroz',
          estimatedGrams: 100,
          calories: 130,
          protein: 3,
          carbs: 28,
          fat: 0.3,
          confidence: 0.8,
        },
      ],
      totals: { calories: 130, protein: 3, carbs: 28, fat: 0.3 },
      provider: 'test',
      analyzedAt: new Date().toISOString(),
    })[0]!;
    const next = recalculateItem(item, 0);
    expect(next.grams).toBe(1);
  });
});
