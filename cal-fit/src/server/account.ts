/**
 * Server-only: permanent account deletion (App Store guideline 5.1.1(v), Google Play's account
 * deletion policy). Removes the user's photos, every row they own (including a linked legacy
 * account's), their RevenueCat customer record and finally the Clerk user itself.
 */

import { deleteClerkUser } from '@/server/clerk';
import { sql } from '@/server/db';
import { deleteRevenueCatCustomer } from '@/server/purchases';
import { deleteUserPhotos } from '@/server/storage';
import { photoOwnerIds } from '@/server/users';

// meal_food rows go with their meal (on delete cascade).
const USER_TABLES = ['meal', 'profile', 'credit_transaction', 'weight_log', 'habit_log'] as const;

export async function deleteAccount(userId: string) {
  if (!sql) throw new Error('DATABASE_URL is not configured');
  const ownerIds = await photoOwnerIds(userId);

  await deleteUserPhotos(ownerIds);
  await sql.transaction(tx => [
    // Cached analyses point at the user's photo keys (`meals/<userId>/…`).
    tx.query(`delete from image_cache where split_part(image_url, '/', 2) = any($1)`, [ownerIds]),
    ...USER_TABLES.map(table => tx.query(`delete from ${table} where user_id = any($1)`, [ownerIds])),
    tx.query('delete from app_user where id = $1', [userId]),
  ]);
  await deleteRevenueCatCustomer(userId);
  // Last, so a failure above leaves the user able to sign in and try again.
  await deleteClerkUser(userId);
}
