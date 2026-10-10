import { describe, expect, it } from 'vitest';
import { calculateNutritionTargets } from '@/features/nutrition/services/calculateNutritionTargets';
import { calculateJointStreak, calculatePersonalStreak } from '@/features/streaks/calculateStreaks';
import { generateNutritionInsights } from '@/features/insights/generateNutritionInsights';
import { applyMealPrivacy, getSimpleDayMessage } from '@/features/privacy/privacy';
import { getHumanErrorMessage } from '@/utils/errors';
import type { MealWithDetails } from '@/types/database';

describe('calculateNutritionTargets', () => {
  it('returns clamped reasonable targets for build muscle', () => {
    const result = calculateNutritionTargets({
      sex: 'male',
      ageYears: 28,
      heightCm: 178,
      weightKg: 80,
      activity: 'quite',
      goalType: 'build_muscle',
    });
    expect(result.calories).toBeGreaterThanOrEqual(1400);
    expect(result.calories).toBeLessThanOrEqual(4200);
    expect(result.protein).toBeGreaterThan(100);
  });

  it('uses maintenance for eat_better', () => {
    const maintain = calculateNutritionTargets({
      sex: 'female',
      ageYears: 30,
      heightCm: 165,
      weightKg: 62,
      activity: 'some',
      goalType: 'maintain',
    });
    const eatBetter = calculateNutritionTargets({
      sex: 'female',
      ageYears: 30,
      heightCm: 165,
      weightKg: 62,
      activity: 'some',
      goalType: 'eat_better',
    });
    expect(Math.abs(maintain.calories - eatBetter.calories)).toBeLessThan(50);
  });
});

describe('streaks', () => {
  it('counts personal streak with min 2 meals/day', () => {
    const now = new Date('2026-03-10T18:00:00');
    const meals = [
      { eatenAt: '2026-03-10T08:00:00' },
      { eatenAt: '2026-03-10T13:00:00' },
      { eatenAt: '2026-03-09T09:00:00' },
      { eatenAt: '2026-03-09T20:00:00' },
      { eatenAt: '2026-03-08T12:00:00' },
    ];
    expect(calculatePersonalStreak(meals, { now, minMeals: 2 })).toBe(2);
  });

  it('requires both users for joint streak', () => {
    const now = new Date('2026-03-10T18:00:00');
    const a = [
      { eatenAt: '2026-03-10T08:00:00' },
      { eatenAt: '2026-03-10T13:00:00' },
      { eatenAt: '2026-03-09T09:00:00' },
      { eatenAt: '2026-03-09T20:00:00' },
    ];
    const b = [
      { eatenAt: '2026-03-10T09:00:00' },
      { eatenAt: '2026-03-10T14:00:00' },
      { eatenAt: '2026-03-09T10:00:00' },
    ];
    expect(calculateJointStreak(a, b, { now, minMeals: 2 })).toBe(1);
  });
});

describe('RACHA streak resilience', () => {
  it('ignores malformed timestamps', () => {
    expect(
      calculatePersonalStreak([{ eatenAt: 'invalid' }], { now: new Date('2026-03-10T18:00:00') }),
    ).toBe(0);
  });
  it('permits explicit paused days without adding fake days', () => {
    const meals = [
      { eatenAt: '2026-03-08T08:00:00' },
      { eatenAt: '2026-03-08T12:00:00' },
      { eatenAt: '2026-03-10T08:00:00' },
      { eatenAt: '2026-03-10T12:00:00' },
    ];
    expect(
      calculateJointStreak(meals, meals, {
        now: new Date('2026-03-10T18:00:00'),
        pausedDayKeys: ['2026-03-09'],
      }),
    ).toBe(2);
  });
});

describe('privacy + simple messages', () => {
  it('redacts macros for partner when share_macros is false', () => {
    const meal = {
      id: '1',
      user_id: 'owner',
      total_calories: 500,
      total_protein: 40,
      total_carbs: 50,
      total_fat: 20,
      meal_items: [
        {
          id: 'i1',
          meal_id: '1',
          food_name: 'Pollo',
          quantity: 100,
          unit: 'g',
          grams: 100,
          calories: 500,
          protein: 40,
          carbs: 50,
          fat: 20,
          confidence: null,
          source: 'manual',
          created_at: '',
        },
      ],
      meal_reactions: [],
      profile: {
        id: 'owner',
        display_name: 'A',
        avatar_url: null,
        share_calories: true,
        share_macros: false,
      },
    } as unknown as MealWithDetails;

    const view = applyMealPrivacy(meal, 'viewer');
    expect(view.hideMacros).toBe(true);
    expect(view.meal.total_protein).toBe(0);
    expect(view.meal.total_calories).toBe(500);
  });

  it('returns actionable simple day message', () => {
    const msg = getSimpleDayMessage({
      consumedCalories: 1200,
      targetCalories: 2200,
      consumedProtein: 80,
      targetProtein: 160,
      mealCount: 2,
    });
    expect(msg.title.length).toBeGreaterThan(0);
    expect(msg.detail.toLowerCase()).toContain('proteína');
  });
});

describe('insights + errors', () => {
  it('generates deterministic insights', () => {
    const insights = generateNutritionInsights({
      meals: Array.from({ length: 10 }).map((_, i) => ({
        eatenAt: new Date(Date.now() - i * 86400000).toISOString(),
        protein: 150,
        calories: 2000,
      })),
      proteinTarget: 140,
    });
    expect(insights.length).toBeGreaterThan(0);
  });

  it('maps technical errors to human messages', () => {
    expect(getHumanErrorMessage(new Error('JWT expired'))).toMatch(/sesión/i);
    expect(getHumanErrorMessage(new Error('PostgrestException RLS'))).not.toMatch(/postgrest/i);
  });
});
