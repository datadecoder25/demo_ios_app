/**
 * POST /api/purchases/sync
 * Auth: Clerk session JWT. Called by the app right after a purchase (and on the paywall).
 * Asks RevenueCat which scan packs this user has bought and credits any not yet credited.
 * Returns { granted, balance }. Works without a public webhook URL, e.g. in development.
 */

import { getUserId, isAuthConfigured, json } from '@/server/auth';
import { balanceFor, fetchVerifiedPurchases, grantPurchase, isPurchasesConfigured } from '@/server/purchases';

export async function POST(request: Request) {
  if (!isAuthConfigured || !isPurchasesConfigured) {
    return json({ message: 'Purchases are not configured on the server.' }, 503);
  }

  const userId = await getUserId(request);
  if (!userId) {
    return json({ message: 'Please sign in.' }, 401);
  }

  try {
    const purchases = await fetchVerifiedPurchases(userId);
    let granted = 0;
    for (const [productId, transactions] of Object.entries(purchases)) {
      for (const tx of transactions) {
        granted += await grantPurchase(userId, productId, tx.store_transaction_id || tx.id);
      }
    }
    return json({ granted, balance: await balanceFor(userId) });
  } catch (error) {
    console.error('purchases/sync error:', error);
    return json({ message: 'Could not confirm your purchase yet. Please try again in a moment.' }, 502);
  }
}
