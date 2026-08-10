import { format, startOfDay, subDays } from 'date-fns';

export interface MealDayPoint {
  eatenAt: string;
}

/**
 * Personal streak: a day counts if the user logged at least `minMeals` meals that calendar day.
 * Uses local timezone of the device (Date).
 */
export function calculatePersonalStreak(
  meals: MealDayPoint[],
  options: { minMeals?: number; now?: Date } = {},
): number {
  const minMeals = options.minMeals ?? 2;
  const now = options.now ?? new Date();
  const counts = countMealsByLocalDay(meals);

  let streak = 0;
  const cursor = startOfDay(now);

  // If today doesn't qualify yet, start from yesterday (don't break mid-day)
  const todayKey = dayKey(cursor);
  if ((counts.get(todayKey) ?? 0) < minMeals) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const key = dayKey(cursor);
    if ((counts.get(key) ?? 0) >= minMeals) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Joint streak: both users must have >= minMeals on the same local calendar day.
 */
export function calculateJointStreak(
  mealsA: MealDayPoint[],
  mealsB: MealDayPoint[],
  options: { minMeals?: number; now?: Date } = {},
): number {
  const minMeals = options.minMeals ?? 2;
  const now = options.now ?? new Date();
  const countsA = countMealsByLocalDay(mealsA);
  const countsB = countMealsByLocalDay(mealsB);

  let streak = 0;
  const cursor = startOfDay(now);
  const todayKey = dayKey(cursor);

  if ((countsA.get(todayKey) ?? 0) < minMeals || (countsB.get(todayKey) ?? 0) < minMeals) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const key = dayKey(cursor);
    if ((countsA.get(key) ?? 0) >= minMeals && (countsB.get(key) ?? 0) >= minMeals) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function countMealsByLocalDay(meals: MealDayPoint[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const meal of meals) {
    const key = dayKey(new Date(meal.eatenAt));
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export function dayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function lastNDayKeys(n: number, now = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 0; i < n; i += 1) {
    keys.push(dayKey(subDays(startOfDay(now), i)));
  }
  return keys.reverse();
}
