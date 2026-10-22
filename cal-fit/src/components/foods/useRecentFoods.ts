import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useUser } from '@/contexts/UserContext';
import { mealApi } from '@/lib/db';

import { FoodDraft, nutrientsOf, scaleNutrients } from './types';

const MAX_RECENT = 8;

/**
 * Distinct foods from the user's own diary, newest first, as one-serving drafts.
 * Logged foods store `servings`, so their totals are divided back to a single serving.
 */
export function useRecentFoods() {
  const { user } = useUser();
  const [recent, setRecent] = useState<FoodDraft[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;

      async function load() {
        if (!user) return;
        const { data } = await mealApi.getRecent(user.id, 60);
        if (!active || !data) return;

        const seen = new Set<string>();
        const foods: FoodDraft[] = [];
        for (const meal of data) {
          const name = meal.manual_name?.trim();
          if (!name || seen.has(name.toLowerCase())) continue;
          seen.add(name.toLowerCase());

          const a = meal.analysis_json ?? {};
          const servings = Number(a.servings) > 0 ? Number(a.servings) : 1;
          foods.push({
            name,
            brand: typeof a.brand === 'string' ? a.brand : null,
            source: 'recent',
            servingLabel: typeof a.servingLabel === 'string' ? a.servingLabel : meal.is_manual ? '1 serving' : '1 meal',
            servingGrams: Number(a.servingGrams) > 0 ? Number(a.servingGrams) : null,
            nutrients: scaleNutrients(nutrientsOf(a), 1 / servings),
          });
          if (foods.length === MAX_RECENT) break;
        }
        setRecent(foods);
      }

      load();
      return () => {
        active = false;
      };
    }, [user])
  );

  return recent;
}
