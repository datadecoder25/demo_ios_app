import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useUser } from '@/contexts/UserContext';
import { habitApi, Meal, mealApi, weightApi, WeightLog } from '@/lib/db';
import { localDay, sumMeals } from '@/lib/nutrition';

/** Days of meal history loaded for the streak calendar (the calorie chart uses the last 7). */
export const CALENDAR_DAYS = 14;

export interface DaySummary {
  date: Date;
  /** Local YYYY-MM-DD key. */
  day: string;
  meals: Meal[];
  calories: number;
}

export interface ProgressData {
  /** Weight check-ins, oldest first. */
  weights: WeightLog[];
  /** The last CALENDAR_DAYS local days, oldest first; the last entry is today. */
  days: DaySummary[];
  /** Workouts completed in the last 7 local days. */
  workoutsThisWeek: number;
}

/** Midnight `daysAgo` days before today, local time. */
function startOfDay(daysAgo: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

/** Weight history, recent meals by day and this week's workouts; reloads on focus. */
export function useProgressData() {
  const { user } = useUser();
  const [data, setData] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    const start = startOfDay(CALENDAR_DAYS - 1);
    const weekStart = startOfDay(6);

    const [weightRes, mealRes, habitRes] = await Promise.all([
      weightApi.list(user.id),
      mealApi.getSince(user.id, start.toISOString()),
      habitApi.getRange(user.id, localDay(weekStart), localDay()),
    ]);
    if (weightRes.error || mealRes.error) {
      setError('Could not load your progress. Pull to refresh or try again later.');
      return;
    }

    const meals = mealRes.data ?? [];
    const days = Array.from({ length: CALENDAR_DAYS }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const day = localDay(date);
      const dayMeals = meals.filter(m => localDay(new Date(m.created_at)) === day);
      return { date, day, meals: dayMeals, calories: Math.round(sumMeals(dayMeals).calories) };
    });

    setError(null);
    setData({
      weights: (weightRes.data ?? []).map(w => ({ ...w, weight_kg: Number(w.weight_kg) })),
      days,
      workoutsThisWeek: (habitRes.data ?? []).filter(h => h.habit === 'workout' && Number(h.amount) > 0).length,
    });
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { data, error, reload };
}

/** "Oct 22" */
export function shortDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Signed difference with one decimal: "+1.5", "-0.4", "0". */
export function signedKg(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}
