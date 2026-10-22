import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useUser } from '@/contexts/UserContext';
import { Habit, habitApi } from '@/lib/db';
import { localDay } from '@/lib/nutrition';

/** Today's water (ml) and workout (0/1) with optimistic setters; reloads on focus. */
export function useTodayHabits() {
  const { user } = useUser();
  const [values, setValues] = useState<Record<Habit, number>>({ water: 0, workout: 0 });

  const reload = useCallback(async () => {
    if (!user) return;
    const today = localDay();
    const { data } = await habitApi.getRange(user.id, today, today);
    if (!data) return;
    setValues({
      water: Number(data.find(h => h.habit === 'water')?.amount ?? 0),
      workout: Number(data.find(h => h.habit === 'workout')?.amount ?? 0),
    });
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  /** Saves a new amount; rolls back if the write fails. Returns whether it saved. */
  async function set(habit: Habit, amount: number): Promise<boolean> {
    if (!user) return false;
    const previous = values[habit];
    setValues(v => ({ ...v, [habit]: amount }));
    const { error } = await habitApi.set(user.id, localDay(), habit, amount);
    if (error) {
      setValues(v => ({ ...v, [habit]: previous }));
      return false;
    }
    return true;
  }

  return { water: values.water, workout: values.workout, set, reload };
}
