import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useUser } from '@/contexts/UserContext';
import { mealApi } from '@/lib/db';
import { DailyTargets, macrosFor, startOfToday, sumMeals } from '@/lib/nutrition';

export interface TodayMeal {
  id: string;
  photo_url: string | null;
  analysis_json: any | null;
  created_at: string;
  is_manual: boolean;
  manual_name: string | null;
}

/** Today's meals plus totals vs. the profile's targets; reloads whenever the screen gains focus. */
export function useTodayMeals() {
  const { user, profile } = useUser();
  const [meals, setMeals] = useState<TodayMeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) return;
    const { data } = await mealApi.getSince(user.id, startOfToday());
    setMeals(data ?? []);
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
