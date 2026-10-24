/**
 * Server-only: keeps public.app_user in sync with Clerk, and links data from the previous
 * Neon Auth account with the same verified email (one time, when the Clerk user has no profile).
 */

import type { ClerkUser } from '@/server/clerk';
import { sql } from '@/server/db';

const USER_TABLES = ['profile', 'meal', 'credit_transaction', 'weight_log', 'habit_log'] as const;

export async function upsertAppUser(user: ClerkUser) {
  if (!sql) throw new Error('DATABASE_URL is not configured');
  await sql.query(
    `insert into app_user (id, email, email_verified, first_name, last_name, image_url, sign_in_methods, last_seen_at)
     values ($1, $2, $3, $4, $5, $6, $7, now())
     on conflict (id) do update set
       email = excluded.email,
       email_verified = excluded.email_verified,
       first_name = excluded.first_name,
       last_name = excluded.last_name,
       image_url = excluded.image_url,
       sign_in_methods = excluded.sign_in_methods,
       last_seen_at = now()`,
    [user.id, user.email, user.emailVerified, user.firstName, user.lastName, user.imageUrl, user.signInMethods]
  );
}

/**
 * Moves rows owned by a Neon Auth user with the same verified email to this Clerk user.
 * Returns the legacy id that was linked, or null.
 */
export async function linkLegacyAccount(user: ClerkUser): Promise<string | null> {
  if (!sql || !user.email || !user.emailVerified) return null;

  const [state] = await sql.query(
    `select
       (select legacy_user_id from app_user where id = $1) as linked,
       exists (select 1 from profile where user_id = $1) as has_profile,
       to_regclass('neon_auth."user"') is not null as has_legacy_auth`,
    [user.id]
  );
  if (state?.linked || state?.has_profile || !state?.has_legacy_auth) return null;

  const [legacy] = await sql.query(
    `select u.id::text as id from neon_auth."user" u
     where lower(u.email) = lower($1)
       and not exists (select 1 from app_user a where a.legacy_user_id = u.id::text)
     limit 1`,
    [user.email]
  );
  if (!legacy?.id) return null;

  await sql.transaction(tx => [
    tx.query('update app_user set legacy_user_id = $2 where id = $1 and legacy_user_id is null', [user.id, legacy.id]),
    // Both accounts may have claimed this month's free scans; keep only the legacy grant.
    tx.query(
      `delete from credit_transaction
       where user_id = $1 and type = 'free' and created_at >= date_trunc('month', now())
         and exists (select 1 from credit_transaction
                     where user_id = $2 and type = 'free' and created_at >= date_trunc('month', now()))`,
      [user.id, legacy.id]
    ),
    ...USER_TABLES.map(table => tx.query(`update ${table} set user_id = $1 where user_id = $2`, [user.id, legacy.id])),
  ]);
  return legacy.id;
}

/** Ids whose stored photos this user may read: their own, plus a linked legacy account's. */
export async function photoOwnerIds(userId: string): Promise<string[]> {
  if (!sql) return [userId];
  const [row] = await sql.query('select legacy_user_id from app_user where id = $1', [userId]);
  return row?.legacy_user_id ? [userId, row.legacy_user_id] : [userId];
}
