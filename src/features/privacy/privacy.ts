import type { MealWithDetails, NutritionGoals, PrivacyFlags, Profile } from '@/types/database';

export function getPrivacyFlags(
  profile: Pick<Profile, keyof PrivacyFlags> | null | undefined,
): PrivacyFlags {
  return {
    share_meals: profile?.share_meals ?? true,
    share_calories: profile?.share_calories ?? true,
    share_macros: profile?.share_macros ?? true,
    share_goals: profile?.share_goals ?? true,
    share_weight: profile?.share_weight ?? false,
  };
}

export interface MealPrivacyView {
  meal: MealWithDetails;
  hideCalories: boolean;
  hideMacros: boolean;
}

/** Redact meal nutrition for a viewer based on owner's privacy prefs. */
export function applyMealPrivacy(meal: MealWithDetails, viewerId: string): MealPrivacyView {
  if (meal.user_id === viewerId) {
    return { meal, hideCalories: false, hideMacros: false };
  }

  const shareCalories = meal.profile?.share_calories ?? true;
  const shareMacros = meal.profile?.share_macros ?? true;

  return {
    hideCalories: !shareCalories,
    hideMacros: !shareMacros,
    meal: {
      ...meal,
      total_calories: shareCalories ? meal.total_calories : 0,
      total_protein: shareMacros ? meal.total_protein : 0,
      total_carbs: shareMacros ? meal.total_carbs : 0,
      total_fat: shareMacros ? meal.total_fat : 0,
      meal_items: shareMacros
        ? meal.meal_items
        : meal.meal_items.map((item) => ({
            ...item,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          })),
    },
  };
}

export function canShowGoals(
  ownerId: string,
  viewerId: string,
  ownerFlags: PrivacyFlags,
): boolean {
  return ownerId === viewerId || ownerFlags.share_goals;
}

export function redactGoalsForViewer(
  goals: NutritionGoals | null,
  ownerId: string,
  viewerId: string,
  ownerFlags: PrivacyFlags,
): NutritionGoals | null {
  if (!goals) return null;
  if (!canShowGoals(ownerId, viewerId, ownerFlags)) return null;
  return goals;
}

export type SimpleDayStatus = 'on_track' | 'need_protein' | 'over' | 'low' | 'empty';

export function getSimpleDayMessage(input: {
  consumedCalories: number;
  targetCalories: number;
  consumedProtein: number;
  targetProtein: number;
  mealCount: number;
}): { status: SimpleDayStatus; title: string; detail: string } {
  const { consumedCalories, targetCalories, consumedProtein, targetProtein, mealCount } = input;

  if (mealCount === 0) {
    return {
      status: 'empty',
      title: 'Todavía no registraste nada hoy',
      detail: 'Empezá con una foto o agregá una comida.',
    };
  }

  const calorieRatio = targetCalories > 0 ? consumedCalories / targetCalories : 0;
  const proteinLeft = Math.max(0, Math.round(targetProtein - consumedProtein));

  if (calorieRatio >= 1.15) {
    return {
      status: 'over',
      title: 'Ya pasaste tu objetivo de hoy',
      detail: 'No pasa nada. Mañana seguís.',
    };
  }

  if (proteinLeft >= 20 && calorieRatio < 0.95) {
    return {
      status: 'need_protein',
      title: 'Te vendría bien sumar proteína',
      detail: `Te faltan aproximadamente ${proteinLeft} g de proteína.`,
    };
  }

  if (consumedProtein >= targetProtein * 0.95) {
    return {
      status: 'on_track',
      title: 'Ya alcanzaste tu objetivo de proteína',
      detail: 'Vas muy bien hoy.',
    };
  }

  if (calorieRatio < 0.4) {
    return {
      status: 'low',
      title: 'Todavía te queda bastante margen',
      detail: 'Seguí registrando lo que comés durante el día.',
    };
  }

  return {
    status: 'on_track',
    title: 'Vas bien hoy',
    detail:
      proteinLeft > 0
        ? `Te faltan aproximadamente ${proteinLeft} g de proteína.`
        : 'Seguí así.',
  };
}
