/**
 * Neon Auth (Managed Better Auth) client over plain fetch.
 * Neon's JS SDK doesn't support React Native, so this talks to the REST endpoints directly.
 * The session lives in an HTTP-only cookie (credentials: 'include'); /token exchanges it for
 * a short-lived JWT that the Data API checks with Row-Level Security.
 */

import { Platform } from 'react-native';

const NEON_AUTH_URL = process.env.EXPO_PUBLIC_NEON_AUTH_URL;

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

let cachedToken: { value: string; expiresAt: number } | null = null;
// Screens load several queries at once; they share one /token request instead of each sending one.
let tokenRequest: Promise<string | null> | null = null;

/** Thrown for 429s and network failures, so callers don't mistake them for "signed out". */
export class AuthUnavailableError extends Error {}

const RETRY_DELAYS_MS = [1000, 2000, 4000];

async function authFetch<T>(path: string, init?: RequestInit, attempt = 0): Promise<T | null> {
  if (!NEON_AUTH_URL) {
    throw new Error('Neon Auth URL not configured');
  }

  let response: Response;
  try {
    response = await fetch(`${NEON_AUTH_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch {
    throw new AuthUnavailableError('Can’t reach the server. Check your connection and try again.');
  }

  // Neon Auth rate-limits bursts (e.g. quick reloads); a 429 must not look like "signed out".
  if (response.status === 429) {
    if (attempt >= RETRY_DELAYS_MS.length) {
      throw new AuthUnavailableError('Too many requests. Please try again in a moment.');
    }
    const retryAfter = Number(response.headers.get('retry-after')) * 1000;
    await new Promise(resolve => setTimeout(resolve, retryAfter > 0 ? retryAfter : RETRY_DELAYS_MS[attempt]));
    return authFetch<T>(path, init, attempt + 1);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || `Auth error: ${response.status}`);
  }
  return body as T | null;
}

export async function signUpWithEmail(name: string, email: string, password: string): Promise<AuthUser> {
  cachedToken = null;
  const body = await authFetch<{ user: AuthUser }>('/sign-up/email', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  if (!body?.user) throw new Error('Sign-up failed');
  return body.user;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  cachedToken = null;
  const body = await authFetch<{ user: AuthUser }>('/sign-in/email', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!body?.user) throw new Error('Sign-in failed');
  return body.user;
}

export type SocialProvider = 'google';

/** Social sign-in needs a browser redirect back to the app, so it's web-only for now. */
export const isSocialSignInSupported = Platform.OS === 'web';

/**
 * Starts Google sign-in: Neon Auth returns the provider's consent URL and, after the user
 * approves, sets the session cookie and redirects back here. Returning users land on Home;
 * new users have no profile yet, so the root layout sends them to onboarding. Failures come
 * back to /sign-in?error=….
 */
export async function signInWithSocial(provider: SocialProvider): Promise<void> {
  if (!isSocialSignInSupported) throw new Error('Social sign-in is only available on the web for now.');
  cachedToken = null;
  const origin = window.location.origin;
  const body = await authFetch<{ url?: string }>('/sign-in/social', {
    method: 'POST',
    body: JSON.stringify({
      provider,
      callbackURL: `${origin}/`,
      errorCallbackURL: `${origin}/sign-in`,
      disableRedirect: true,
    }),
  });
  if (!body?.url) throw new Error('Could not start sign-in. Please try again.');
  window.location.assign(body.url);
}

export async function signOut(): Promise<void> {
  cachedToken = null;
  await authFetch('/sign-out', { method: 'POST', body: '{}' });
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const body = await authFetch<{ user: AuthUser }>('/get-session');
  return body?.user ?? null;
}

function decodeJwtExpiry(token: string): number {
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const { exp } = JSON.parse(atob(payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=')));
  return exp * 1000;
}

/** Drops the cached JWT so the next request fetches a fresh one (e.g. after a 401). */
export function clearAccessToken() {
  cachedToken = null;
}

/** Returns a JWT for the Data API, refreshing it shortly before it expires (they last ~15 min). */
export async function getAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
    return cachedToken.value;
  }

  tokenRequest ??= (async () => {
    try {
      const body = await authFetch<{ token: string }>('/token');
      if (!body?.token) return null;
      cachedToken = { value: body.token, expiresAt: decodeJwtExpiry(body.token) };
      return body.token;
    } catch {
      cachedToken = null;
      return null;
    } finally {
      tokenRequest = null;
    }
  })();
  return tokenRequest;
}

/**
 * Emails a password-reset link. The link opens `redirectTo?token=…` (the reset-password
 * screen); redirectTo must be one of Neon Auth's trusted origins.
 */
export async function requestPasswordReset(email: string, redirectTo: string): Promise<void> {
  await authFetch('/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ email, redirectTo }),
  });
}

/** Sets a new password using the token from the reset link. */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  cachedToken = null;
  await authFetch('/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}
