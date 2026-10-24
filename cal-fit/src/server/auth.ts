/**
 * Server-only: verifies the Clerk session JWT the app sends as `Authorization: Bearer …`.
 * The issuer and its signing keys come from the publishable key's Frontend API host.
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';

/** pk_test_<base64("<frontend api host>$")> → https://<frontend api host> */
function frontendApiFrom(publishableKey: string | undefined): string | null {
  const encoded = publishableKey?.split('_')[2];
  if (!encoded) return null;
  try {
    const host = atob(encoded).replace(/\$$/, '');
    return host ? `https://${host}` : null;
  } catch {
    return null;
  }
}

const issuer = frontendApiFrom(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY);
const jwks = issuer ? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`)) : undefined;

export const isAuthConfigured = !!jwks;

export function bearerToken(request: Request): string | null {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || null;
}

/** The signed-in Clerk user id (user_…), or null when the token is missing, invalid or expired. */
export async function getUserId(request: Request): Promise<string | null> {
  const token = bearerToken(request);
  if (!token || !jwks || !issuer) return null;

  try {
    const { payload } = await jwtVerify(token, jwks, { issuer });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}
