import { startOfWeek, format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import type { ChallengeMetric, ChallengeScope, WeeklyChallenge } from '@/types/database';
import { countMealsByLocalDay, dayKey, lastNDayKeys } from '@/features/streaks/calculateStreaks';

export const CHALLENGE_TEMPLATES: {
  metric: ChallengeMetric;
  title: string;
  targetDays: number;
  description: string;
}[] = [
  {
    metric: 'log_meals_days',
    title: 'Registrar comidas 5 días',
    targetDays: 5,
    description: 'Al menos 2 comidas por día',
  },
  {
    metric: 'protein_goal_days',
    title: 'Proteína 5 días',
    targetDays: 5,
    description: 'Alcanzá tu objetivo de proteína',
  },
  {
    metric: 'water_goal_days',
    title: 'Agua 5 días',
    targetDays: 5,
    description: 'Cumplí tu objetivo de agua',
  },
];

export function currentWeekStart(date = new Date()): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export async function fetchActiveChallenges(userId: string): Promise<WeeklyChallenge[]> {
  const weekStart = currentWeekStart();
  const { data, error } = await supabase
    .from('weekly_challenges')
    .select('*')
    .eq('week_start', weekStart)
    .or(`created_by.eq.${userId},partner_id.eq.${userId}`);

  if (error) throw error;
  return (data ?? []) as WeeklyChallenge[];
}

export async function createChallenge(input: {
  userId: string;
  partnerId?: string | null;
  scope: ChallengeScope;
  metric: ChallengeMetric;
  title: string;
  targetDays: number;
}): Promise<WeeklyChallenge> {
  const { data, error } = await supabase
    .from('weekly_challenges')
    .insert({
      created_by: input.userId,
      partner_id: input.scope === 'joint' ? input.partnerId : null,
      scope: input.scope,
      metric: input.metric,
      title: input.title,
      target_days: input.targetDays,
      week_start: currentWeekStart(),
    })
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No se pudo crear el desafío');
  return data;
}

export function computeChallengeProgress(input: {
  metric: ChallengeMetric;
  targetDays: number;
  meals: { eatenAt: string; protein: number }[];
  proteinTarget: number;
  waterByDay: Map<string, number>;
  waterGoalMl: number;
  now?: Date;
}): { completedDays: number; targetDays: number } {
  const now = input.now ?? new Date();
  const weekDays = lastNDayKeys(7, now).slice(-7);
  // Align to Mon-Sun of current week roughly via last 7 including today
  const mealCounts = countMealsByLocalDay(input.meals.map((m) => ({ eatenAt: m.eatenAt })));

  let completed = 0;
  for (const day of weekDays) {
    if (input.metric === 'log_meals_days') {
      if ((mealCounts.get(day) ?? 0) >= 2) completed += 1;
    } else if (input.metric === 'protein_goal_days') {
      const protein = input.meals
        .filter((m) => dayKey(new Date(m.eatenAt)) === day)
        .reduce((s, m) => s + m.protein, 0);
      if (protein >= input.proteinTarget * 0.9) completed += 1;
    } else if (input.metric === 'water_goal_days') {
      if ((input.waterByDay.get(day) ?? 0) >= input.waterGoalMl) completed += 1;
    }
  }

  return { completedDays: Math.min(completed, input.targetDays), targetDays: input.targetDays };
}
