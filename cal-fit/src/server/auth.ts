/**
 * Server-only: verifies the Neon Auth JWT that the app sends as `Authorization: Bearer …`.
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';

const authUrl = process.env.EXPO_PUBLIC_NEON_AUTH_URL;
const authOrigin = authUrl ? new URL(authUrl).origin : undefined;
const jwks = authUrl ? createRemoteJWKSet(new URL(`${authUrl}/.well-known/jwks.json`)) : undefined;

export const isAuthConfigured = !!jwks;

export function bearerToken(request: Request): string | null {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || null;
}

/** The signed-in user's id, or null when the token is missing, invalid or expired. */
export async function getUserId(request: Request): Promise<string | null> {
  const token = bearerToken(request);
  if (!token || !jwks || !authOrigin) return null;

  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: authOrigin, audience: authOrigin });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}
