/**
 * POST /api/me
 * Auth: Clerk session JWT. Called by the app after every sign-in.
 * Syncs the user's verified email/name from Clerk into public.app_user (the source for
 * marketing_contacts) and links data from a previous Neon Auth account with the same verified
 * email. Returns { linked } (true when legacy data was moved to this account).
 */

import { getUserId, isAuthConfigured, json } from '@/server/auth';
import { getClerkUser, isClerkBackendConfigured } from '@/server/clerk';
import { linkLegacyAccount, upsertAppUser } from '@/server/users';

export async function POST(request: Request) {
  if (!isAuthConfigured || !isClerkBackendConfigured) {
    return json({ message: 'Sign-in is not configured on the server.' }, 503);
  }

  const userId = await getUserId(request);
  if (!userId) {
    return json({ message: 'Please sign in.' }, 401);
  }

  try {
    const user = await getClerkUser(userId);
    await upsertAppUser(user);
    const linkedFrom = await linkLegacyAccount(user);
    if (linkedFrom) console.log(`Linked Neon Auth user ${linkedFrom} to Clerk user ${userId}`);
    return json({ linked: !!linkedFrom });
  } catch (error) {
    console.error('me sync error:', error);
    return json({ message: 'Could not load your account. Please try again.' }, 502);
  }
}
