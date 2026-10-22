/**
 * Neon Auth (Managed Better Auth) client over plain fetch.
 * Neon's JS SDK doesn't support React Native, so this talks to the REST endpoints directly.
 * The session lives in an HTTP-only cookie (credentials: 'include'); /token exchanges it for
 * a short-lived JWT that the Data API checks with Row-Level Security.
 */

const NEON_AUTH_URL = process.env.EXPO_PUBLIC_NEON_AUTH_URL;

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function authFetch<T>(path: string, init?: RequestInit, retries = 2): Promise<T | null> {
  if (!NEON_AUTH_URL) {
    throw new Error('Neon Auth URL not configured');
  }

  const response = await fetch(`${NEON_AUTH_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  // Neon Auth rate-limits bursts (e.g. quick reloads); a 429 must not look like "signed out".
  if (response.status === 429 && retries > 0) {
    await new Promise(resolve => setTimeout(resolve, 1000 * (3 - retries)));
    return authFetch<T>(path, init, retries - 1);
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

/** Returns a JWT for the Data API, refreshing it shortly before it expires (they last ~15 min). */
export async function getAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
    return cachedToken.value;
  }

  try {
    const body = await authFetch<{ token: string }>('/token');
    if (!body?.token) return null;
    cachedToken = { value: body.token, expiresAt: decodeJwtExpiry(body.token) };
    return body.token;
  } catch {
    cachedToken = null;
    return null;
  }
}
