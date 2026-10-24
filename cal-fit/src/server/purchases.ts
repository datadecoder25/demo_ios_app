/**
 * Server-only: grants scan credits for verified RevenueCat purchases.
 *
 * Credits are written with the owner connection (DATABASE_URL), because purchase grants must
 * not be possible from the app. Each store transaction is credited at most once: the
 * reference 'rc:<store transaction id>' is unique (credit_tx_store_ref_idx in db/schema.sql).
 */

import { scanPackFor } from '@/lib/scanPacks';
import { sql } from '@/server/db';

const REVENUECAT_API_URL = 'https://api.revenuecat.com/v1';
const UNIQUE_VIOLATION = '23505';

export const isPurchasesConfigured = !!sql && !!process.env.REVENUECAT_SECRET_KEY;

interface NonSubscriptionPurchase {
  id: string;
  store_transaction_id?: string;
  purchase_date: string;
  store: string;
  is_sandbox: boolean;
}

/** One-time purchases RevenueCat has verified for this user, keyed by product id. */
export async function fetchVerifiedPurchases(userId: string): Promise<Record<string, NonSubscriptionPurchase[]>> {
  const response = await fetch(`${REVENUECAT_API_URL}/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${process.env.REVENUECAT_SECRET_KEY}` },
  });
  if (!response.ok) {
    throw new Error(`RevenueCat subscriber lookup failed: ${response.status} ${await response.text()}`);
  }
  const body = (await response.json()) as { subscriber?: { non_subscriptions?: Record<string, NonSubscriptionPurchase[]> } };
  return body.subscriber?.non_subscriptions ?? {};
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === UNIQUE_VIOLATION;
}

/** Credits a purchase once; returns the credits granted (0 if already granted or unknown product). */
export async function grantPurchase(userId: string, productId: string, transactionId: string): Promise<number> {
  const pack = scanPackFor(productId);
  if (!sql || !pack || !transactionId) return 0;

  try {
    const rows = await sql.query(
      `insert into credit_transaction (user_id, amount, type, reference_id)
       select $1, $2, 'purchase', $3
       where exists (select 1 from app_user where id = $1)
         and not exists (select 1 from credit_transaction where reference_id = $3)
       returning id`,
      [userId, pack.credits, `rc:${transactionId}`]
    );
    return rows.length > 0 ? pack.credits : 0;
  } catch (error) {
    // A concurrent sync/webhook granted it first.
    if (isUniqueViolation(error)) return 0;
    throw error;
  }
}

/** Takes back a refunded purchase's credits once (only if it was granted). Returns credits removed. */
export async function revokePurchase(userId: string, productId: string, transactionId: string): Promise<number> {
  const pack = scanPackFor(productId);
  if (!sql || !pack || !transactionId) return 0;

  try {
    const rows = await sql.query(
      `insert into credit_transaction (user_id, amount, type, reference_id)
       select $1, $2, 'refunded', $3
       where exists (select 1 from credit_transaction where reference_id = $4 and user_id = $1)
         and not exists (select 1 from credit_transaction where reference_id = $3)
       returning id`,
      [userId, -pack.credits, `rc-refund:${transactionId}`, `rc:${transactionId}`]
    );
    return rows.length > 0 ? pack.credits : 0;
  } catch (error) {
    if (isUniqueViolation(error)) return 0;
    throw error;
  }
}

/** The user's current balance. */
export async function balanceFor(userId: string): Promise<number> {
  if (!sql) return 0;
  const rows = await sql.query('select coalesce(sum(amount), 0)::int as balance from credit_transaction where user_id = $1', [userId]);
  return Number(rows[0]?.balance ?? 0);
}

/** Deletes the user's RevenueCat customer record (account deletion). No-op when not configured. */
export async function deleteRevenueCatCustomer(userId: string) {
  if (!process.env.REVENUECAT_SECRET_KEY) return;
  const response = await fetch(`${REVENUECAT_API_URL}/subscribers/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${process.env.REVENUECAT_SECRET_KEY}` },
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`RevenueCat customer deletion failed: ${response.status} ${await response.text()}`);
  }
}
