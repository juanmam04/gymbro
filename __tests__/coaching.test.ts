import { describe, expect, it } from 'vitest';
import {
  dailyGuidance,
  weeklyReport,
  mealIdeas,
  DEFAULT_PREFERENCES,
} from '@/features/coaching/coach';
import { calculatePersonalStreak, calculateJointStreak } from '@/features/streaks/calculateStreaks';
const now = new Date('2026-10-10T15:00:00');
const meal = (day: number, protein = 20) => ({
  eatenAt: `2026-10-${String(day).padStart(2, '0')}T12:00:00`,
  protein,
  calories: 400,
});
describe('weekly report boundaries', () => {
  it('compares completed days and excludes an unfinished today and future meals', () => {
    const report = weeklyReport([meal(10), meal(11), meal(9), meal(9), meal(8), meal(2)], now);
    expect(report.loggedDays).toBe(2);
    expect(report.previousLoggedDays).toBe(1);
    expect(report.delta).toBe(1);
    expect(report.mealCount).toBe(3);
    expect(report.averageLoggedProtein).toBe(30);
  });
  it('does not invent nutritional averages without data', () => {
    const report = weeklyReport([{ eatenAt: 'invalid', protein: 40, calories: 500 }], now);
    expect(report.loggedDays).toBe(0);
    expect(report.averageLoggedProtein).toBeNull();
    expect(report.caveat).toContain('registradas');
  });
  it('deduplicates days and keeps data after breaking a streak', () => {
    const meals = [meal(9), meal(9), meal(7)];
    expect(weeklyReport(meals, now).loggedDays).toBe(2);
    expect(calculatePersonalStreak(meals, { now })).toBe(1);
  });
});
describe('daily guidance', () => {
  it('does not judge an incomplete day after one entry', () =>
    expect(dailyGuidance([meal(10)], 140, now).focus).toBe('logging'));
  it('uses only today for guidance', () =>
    expect(dailyGuidance([meal(9, 300)], 140, now).focus).toBe('logging'));
  it('suggests protein only from multiple logged meals', () =>
    expect(dailyGuidance([meal(10), meal(10)], 140, now).focus).toBe('protein'));
});
describe('preferences', () => {
  it('never includes meat or dairy in combined preferences', () => {
    const ideas = mealIdeas({ ...DEFAULT_PREFERENCES, vegetarian: true, dairyFree: true });
    expect(ideas.length).toBeGreaterThan(0);
    expect(ideas.every((i) => i.vegetarian && i.dairyFree && i.lowCost)).toBe(true);
  });
});
describe('logging streak', () => {
  it('one meal counts by default', () =>
    expect(calculatePersonalStreak([meal(10), meal(9)], { now })).toBe(2));
  it('both must log on the same day', () =>
    expect(calculateJointStreak([meal(10), meal(9)], [meal(9)], { now })).toBe(1));
});
