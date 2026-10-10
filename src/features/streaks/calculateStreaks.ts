import { format, startOfDay, subDays } from 'date-fns';
export interface MealDayPoint {
  eatenAt: string;
}
export interface StreakOptions {
  minMeals?: number;
  now?: Date;
  pausedDayKeys?: readonly string[];
}
export function dayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
export function countMealsByLocalDay(meals: MealDayPoint[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const meal of meals) {
    const date = new Date(meal.eatenAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = dayKey(date);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}
export function lastNDayKeys(n: number, now = new Date()): string[] {
  return Array.from({ length: Math.max(0, n) }, (_, i) =>
    dayKey(subDays(startOfDay(now), n - i - 1)),
  );
}
function countStreak(qualifies: (key: string) => boolean, options: StreakOptions): number {
  const cursor = startOfDay(options.now ?? new Date());
  const paused = new Set(options.pausedDayKeys ?? []);
  const passes = (date: Date) => qualifies(dayKey(date)) || paused.has(dayKey(date));
  if (!passes(cursor)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  for (let i = 0; i < 3660; i++) {
    const key = dayKey(cursor);
    if (!qualifies(key) && !paused.has(key)) break;
    if (qualifies(key)) streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
/** Rewards consistent logging, not calories or food restriction. */
export function calculatePersonalStreak(
  meals: MealDayPoint[],
  options: StreakOptions = {},
): number {
  const counts = countMealsByLocalDay(meals);
  const min = Math.max(1, Math.floor(options.minMeals ?? 1));
  return countStreak((key) => (counts.get(key) ?? 0) >= min, options);
}
export function calculateJointStreak(
  a: MealDayPoint[],
  b: MealDayPoint[],
  options: StreakOptions = {},
): number {
  const ac = countMealsByLocalDay(a),
    bc = countMealsByLocalDay(b);
  const min = Math.max(1, Math.floor(options.minMeals ?? 1));
  return countStreak((key) => (ac.get(key) ?? 0) >= min && (bc.get(key) ?? 0) >= min, options);
}
