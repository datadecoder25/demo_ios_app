/**
 * Server-only: AI scan credits, read and spent with the owner connection (DATABASE_URL) for
 * the user id the route already verified. Clerk session tokens last only 60 seconds, so the
 * user's token can't be relied on after a long upload and analysis.
 */

import { sql } from '@/server/db';

export async function creditBalance(userId: string): Promise<number> {
  if (!sql) throw new Error('DATABASE_URL is not configured');
  const [row] = await sql.query(
    'select coalesce(sum(amount), 0)::int as balance from credit_transaction where user_id = $1',
    [userId]
  );
  return row.balance;
}

/** Spends one credit; resolves to the new balance, or -1 when there was none to spend. */
export async function spendCredit(userId: string, reference: string): Promise<number> {
  if (!sql) throw new Error('DATABASE_URL is not configured');
  const [row] = await sql.query('select public.spend_credit_for($1, $2) as balance', [userId, reference]);
  return row.balance;
}
