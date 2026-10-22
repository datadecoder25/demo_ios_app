import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useUser } from '@/contexts/UserContext';
import { Meal, mealApi } from '@/lib/db';
import { DailyTargets, macrosFor, startOfToday, sumMeals } from '@/lib/nutrition';

export type TodayMeal = Meal;

/** Today's meals plus totals vs. the profile's targets; reloads whenever the screen gains focus. */
export function useTodayMeals() {
  const { user, profile } = useUser();
  const [meals, setMeals] = useState<TodayMeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) return;
    const { data, error } = await mealApi.getSince(user.id, startOfToday());
    // On failure keep what's on screen rather than showing an empty day.
    if (!error) setMeals(data ?? []);
    setIsLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const eaten: DailyTargets = sumMeals(meals);
  const calorieTarget = profile?.daily_calorie_target ?? 0;
  const targets: DailyTargets = { calories: calorieTarget, ...macrosFor(calorieTarget) };

  return {
    meals,
    eaten,
    targets,
    caloriesLeft: Math.max(0, Math.round(targets.calories - eaten.calories)),
    isLoading,
    reload,
  };
}
