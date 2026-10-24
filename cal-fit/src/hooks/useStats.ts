import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useUser } from '@/contexts/UserContext';
import { onStatsChanged, statsApi, UserStats } from '@/lib/db';

const RETRY_DELAY_MS = 1500;

// Last stats loaded by any screen, so switching tabs shows them immediately instead of
// flashing zeros while the refetch runs. Keyed by user so a new sign-in never sees stale data.
let lastStats: { userId: string; stats: UserStats } | null = null;

/**
 * Streak/XP stats from user_stats; reloads whenever the screen gains focus and after any
 * write that changes them (a meal, weigh-in or habit saved anywhere in the app).
 * `stats` is null until the first load succeeds, so screens can show a placeholder
 * rather than a misleading 0-day streak.
 */
export function useStats() {
  const { user } = useUser();
  const [stats, setStats] = useState<UserStats | null>(
    user && lastStats?.userId === user.id ? lastStats.stats : null
  );

  // Only the newest request may update the screen, so a slow earlier response can't
  // overwrite stats that already include a just-saved meal.
  const latestRequest = useRef(0);

  const reload = useCallback(async () => {
    if (!user) return;
    const request = ++latestRequest.current;
    let { data } = await statsApi.get();
    if (!data) {
      // One retry covers brief outages (token refresh, rate limiting).
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      ({ data } = await statsApi.get());
    }
    if (data && request === latestRequest.current) {
      lastStats = { userId: user.id, stats: data };
      setStats(data);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  useEffect(() => onStatsChanged(reload), [reload]);

  return { stats, reload };
}
