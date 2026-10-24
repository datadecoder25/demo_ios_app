/**
 * Session tokens for API calls, from Clerk.
 *
 * Sign-in itself happens in the auth screens with Clerk's hooks (email + password, Google and
 * Apple). This module gives non-React code (db.ts, ai.ts, photos.ts, purchases.ts) the
 * signed-in user's short-lived session JWT, which the Neon Data API and /api routes verify.
 */

import { getClerkInstance } from '@clerk/expo';

export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

/** Thrown for network failures and rate limits, so callers don't mistake them for "signed out". */
export class AuthUnavailableError extends Error {}

/** The current session's JWT (Clerk caches and refreshes it), or null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  try {
    const clerk = getClerkInstance();
    return (await clerk.session?.getToken()) ?? null;
  } catch (error) {
    console.error('Could not get a session token:', error);
    return null;
  }
}

/** Forces the next getAccessToken() to fetch a fresh token (e.g. after a 401). */
export async function clearAccessToken() {
  try {
    await getClerkInstance().session?.getToken({ skipCache: true });
  } catch {
    // The next request will retry.
  }
}

/** Clerk errors carry a user-facing message in errors[0]; fall back to a generic one. */
export function clerkErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const e = error as { errors?: { longMessage?: string; message?: string }[]; message?: string } | null;
  return e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || e?.message || fallback;
}
