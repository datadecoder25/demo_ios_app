import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useUser } from '@/contexts/UserContext';
import { creditTransactionApi } from '@/lib/db';

/** Free AI scans granted each calendar month by claim_free_credits (db/schema.sql). */
export const FREE_MONTHLY_CREDITS = 4;

/** First day of next month, when claim_free_credits grants the next batch. */
export function nextCreditRenewal(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

/** Credit balance (sum of the ledger) and this month's usage; reloads on focus. */
export function useCredits() {
  const { user } = useUser();
  const [balance, setBalance] = useState<number | null>(null);
  const [usedThisMonth, setUsedThisMonth] = useState(0);

  const reload = useCallback(async () => {
    if (!user) return;
    const { data } = await creditTransactionApi.getByUserId(user.id);
    if (!data) return;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    setBalance(data.reduce((sum, tx) => sum + tx.amount, 0));
    setUsedThisMonth(
      data
        .filter(tx => tx.type === 'used' && new Date(tx.created_at) >= monthStart)
        .reduce((sum, tx) => sum - tx.amount, 0)
    );
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { balance, usedThisMonth, renewsOn: nextCreditRenewal(), reload };
}
