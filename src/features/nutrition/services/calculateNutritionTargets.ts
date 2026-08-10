/**
 * Estimación de objetivos nutricionales diarios.
 *
 * Metodología:
 * 1. BMR (Mifflin–St Jeor, 1990)
 *    - female: 10·kg + 6.25·cm − 5·edad − 161
 *    - male:   10·kg + 6.25·cm − 5·edad + 5
 *    - unspecified: promedio de ambas
 * 2. TDEE ≈ BMR × factor de actividad (valores clásicos Harris–Benedict adaptados)
 * 3. Objetivo calórico según goal_type (eat_better / maintain ≈ mantenimiento)
 * 4. Macros: proteína por kg, grasa ~28% kcal, carbos el resto
 *
 * Limitaciones (importante):
 * - Es una estimación heurística, no consejo médico ni medición metabólica.
 * - No contempla masa magra, condiciones clínicas, ni medicamentos.
 * - Los resultados se clamp-ean a rangos seguros de producto.
 */

import type { GoalType } from '@/types/database';

export type BiologicalSex = 'female' | 'male' | 'unspecified';
export type ActivityLevel = 'little' | 'some' | 'quite' | 'lots';

export interface NutritionEstimateInput {
  sex: BiologicalSex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goalType: GoalType;
}

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  little: 1.2,
  some: 1.375,
  quite: 1.55,
  lots: 1.725,
};

const GOAL_CALORIE_FACTOR: Record<GoalType, number> = {
  eat_better: 1.0,
  maintain: 1.0,
  lose_fat: 0.85,
  build_muscle: 1.1,
};

const PROTEIN_G_PER_KG: Record<GoalType, number> = {
  eat_better: 1.6,
  maintain: 1.6,
  lose_fat: 1.8,
  build_muscle: 2.0,
};

const FAT_CALORIE_RATIO = 0.28;

export function calculateNutritionTargets(input: NutritionEstimateInput): NutritionTargets {
  const age = clamp(Math.round(input.ageYears), 14, 90);
  const height = clamp(input.heightCm, 120, 230);
  const weight = clamp(input.weightKg, 35, 250);

  const bmr = estimateBmr(input.sex, weight, height, age);
  const tdee = bmr * ACTIVITY_MULTIPLIER[input.activity];
  let calories = Math.round(tdee * GOAL_CALORIE_FACTOR[input.goalType]);
  calories = clamp(calories, 1400, 4200);

  let protein = Math.round(weight * PROTEIN_G_PER_KG[input.goalType]);
  protein = clamp(protein, 60, 250);

  let fat = Math.round((calories * FAT_CALORIE_RATIO) / 9);
  fat = clamp(fat, 35, 140);

  const proteinCals = protein * 4;
  const fatCals = fat * 9;
  let carbs = Math.round((calories - proteinCals - fatCals) / 4);
  carbs = clamp(carbs, 80, 500);

  // Rebalance calories display to sum of macros (consumer-friendly consistency)
  const reconciledCalories = protein * 4 + carbs * 4 + fat * 9;

  return {
    calories: clamp(reconciledCalories, 1400, 4200),
    protein,
    carbs,
    fat,
  };
}

function estimateBmr(sex: BiologicalSex, weightKg: number, heightCm: number, age: number): number {
  const female = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const male = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;

  if (sex === 'female') return female;
  if (sex === 'male') return male;
  return (female + male) / 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
