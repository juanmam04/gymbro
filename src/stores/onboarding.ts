import { create } from 'zustand';
import type { ActivityLevel, BiologicalSex, GoalType } from '@/types/database';
import type { NutritionTargets } from '@/features/nutrition/services/calculateNutritionTargets';

interface OnboardingState {
  displayName: string;
  goalType: GoalType | null;
  sex: BiologicalSex | null;
  ageYears: number | null;
  heightCm: number | null;
  weightKg: number | null;
  activity: ActivityLevel | null;
  estimatedTargets: NutritionTargets | null;
  setDisplayName: (value: string) => void;
  setGoalType: (value: GoalType) => void;
  setBody: (values: {
    sex: BiologicalSex;
    ageYears: number;
    heightCm: number;
    weightKg: number;
  }) => void;
  setActivity: (value: ActivityLevel) => void;
  setEstimatedTargets: (value: NutritionTargets) => void;
  reset: () => void;
}

const initialState = {
  displayName: '',
  goalType: null as GoalType | null,
  sex: null as BiologicalSex | null,
  ageYears: null as number | null,
  heightCm: null as number | null,
  weightKg: null as number | null,
  activity: null as ActivityLevel | null,
  estimatedTargets: null as NutritionTargets | null,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setDisplayName: (displayName) => set({ displayName }),
  setGoalType: (goalType) => set({ goalType }),
  setBody: (values) => set(values),
  setActivity: (activity) => set({ activity }),
  setEstimatedTargets: (estimatedTargets) => set({ estimatedTargets }),
  reset: () => set(initialState),
}));
