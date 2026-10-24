/**
 * DELETE /api/account
 * Auth: Clerk session JWT.
 * Permanently deletes the signed-in user's account: photos, meals, weigh-ins, credits, the
 * app_user record (so they leave marketing_contacts), RevenueCat customer and Clerk user.
 */

import { deleteAccount } from '@/server/account';
import { getUserId, isAuthConfigured, json } from '@/server/auth';
import { isClerkBackendConfigured } from '@/server/clerk';
import { sql } from '@/server/db';

export async function DELETE(request: Request) {
  if (!isAuthConfigured || !isClerkBackendConfigured || !sql) {
    return json({ message: 'Account deletion is not configured on the server.' }, 503);
  }

  const userId = await getUserId(request);
  if (!userId) {
    return json({ message: 'Please sign in.' }, 401);
  }

  try {
    await deleteAccount(userId);
    console.log(`Deleted account ${userId}`);
    return json({ deleted: true });
  } catch (error) {
    console.error('account deletion error:', error);
    return json({ message: 'Could not delete your account. Please try again.' }, 502);
  }
}
