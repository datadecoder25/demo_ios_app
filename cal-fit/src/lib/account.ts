/**
 * Account bootstrap: /api/me copies the signed-in Clerk user's verified email and name into
 * the database (public.app_user) and links data from a previous account with that email.
 */

import { apiUrl } from '@/lib/api';
import { AuthUnavailableError, getAccessToken } from '@/lib/auth';

export async function syncAccount(): Promise<{ linked: boolean }> {
  const token = await getAccessToken();
  if (!token) throw new AuthUnavailableError('Your session expired. Please try again.');

  let response: Response;
  try {
    response = await fetch(apiUrl('/api/me'), { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new AuthUnavailableError('Can’t reach the server. Check your connection and try again.');
  }

  const data = await response.json().catch(() => null);
  if (response.status === 503) {
    // Server not configured for Clerk yet: the app still works, the account just isn't mirrored.
    console.warn('Account sync skipped:', data?.message);
    return { linked: false };
  }
  if (!response.ok) throw new AuthUnavailableError(data?.message || 'Could not load your account. Please try again.');
  return data;
}

/** Permanently deletes the signed-in user's account and data on the server. */
export async function deleteAccount(): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new AuthUnavailableError('Your session expired. Please sign in again.');

  let response: Response;
  try {
    response = await fetch(apiUrl('/api/account'), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new AuthUnavailableError('Can’t reach the server. Check your connection and try again.');
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || 'Could not delete your account. Please try again.');
  }
}
