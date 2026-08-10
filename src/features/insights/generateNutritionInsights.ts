import { calculatePersonalStreak, countMealsByLocalDay, dayKey, lastNDayKeys } from '@/features/streaks/calculateStreaks';

export interface InsightInput {
  meals: { eatenAt: string; protein: number; calories: number }[];
  proteinTarget: number;
  waterByDay?: Map<string, number>;
  waterGoalMl?: number;
  now?: Date;
}

export interface NutritionInsight {
  id: string;
  title: string;
  detail: string;
}

export function generateNutritionInsights(input: InsightInput): NutritionInsight[] {
  const now = input.now ?? new Date();
  const last7 = lastNDayKeys(7, now);
  const mealsByDay = countMealsByLocalDay(input.meals.map((m) => ({ eatenAt: m.eatenAt })));

  const daysWithMeals = last7.filter((d) => (mealsByDay.get(d) ?? 0) > 0).length;
  const proteinDays = last7.filter((day) => {
    const dayProtein = input.meals
      .filter((m) => dayKey(new Date(m.eatenAt)) === day)
      .reduce((sum, m) => sum + m.protein, 0);
    return dayProtein >= input.proteinTarget * 0.9;
  }).length;

  const weekMeals = input.meals.filter((m) => last7.includes(dayKey(new Date(m.eatenAt))));
  const avgProtein =
    weekMeals.length > 0
      ? Math.round(weekMeals.reduce((s, m) => s + m.protein, 0) / Math.max(daysWithMeals, 1))
      : 0;

  const streak = calculatePersonalStreak(
    input.meals.map((m) => ({ eatenAt: m.eatenAt })),
    { now },
  );

  const insights: NutritionInsight[] = [];

  if (daysWithMeals > 0) {
    insights.push({
      id: 'consistency',
      title: `Registraste comidas ${daysWithMeals} de los últimos 7 días`,
      detail: daysWithMeals >= 5 ? 'Muy constante.' : 'Cada registro suma.',
    });
  }

  if (proteinDays > 0) {
    insights.push({
      id: 'protein',
      title: `Cumpliste tu objetivo de proteína ${proteinDays} de los últimos 7 días`,
      detail: `Tu promedio de proteína esta semana fue ≈ ${avgProtein} g.`,
    });
  }

  if (streak > 0) {
    insights.push({
      id: 'streak',
      title: `Llevás ${streak} día${streak === 1 ? '' : 's'} de racha`,
      detail: 'Un día cuenta cuando registrás al menos 2 comidas.',
    });
  }

  if (input.waterByDay && input.waterGoalMl) {
    const waterDays = last7.filter((d) => (input.waterByDay!.get(d) ?? 0) >= input.waterGoalMl!).length;
    if (waterDays > 0) {
      insights.push({
        id: 'water',
        title: `Alcanzaste tu objetivo de agua ${waterDays} de los últimos 7 días`,
        detail: 'Buen hábito.',
      });
    }
  }

  return insights.slice(0, 4);
}
