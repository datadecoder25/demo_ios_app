/**
 * Server-only: Clerk Backend API (needs CLERK_SECRET_KEY).
 */

const CLERK_API_URL = 'https://api.clerk.com/v1';

export const isClerkBackendConfigured = !!process.env.CLERK_SECRET_KEY;

export interface ClerkUser {
  id: string;
  email: string | null;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  signInMethods: string[];
}

interface ClerkUserJSON {
  id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  password_enabled: boolean;
  primary_email_address_id: string | null;
  email_addresses: { id: string; email_address: string; verification: { status: string } | null }[];
  external_accounts: { provider: string }[];
}

export async function getClerkUser(userId: string): Promise<ClerkUser> {
  const response = await fetch(`${CLERK_API_URL}/users/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
  });
  if (!response.ok) {
    throw new Error(`Clerk user lookup failed: ${response.status} ${await response.text()}`);
  }
  const user = (await response.json()) as ClerkUserJSON;
  const primary = user.email_addresses.find(e => e.id === user.primary_email_address_id) ?? user.email_addresses[0];

  return {
    id: user.id,
    email: primary?.email_address ?? null,
    emailVerified: primary?.verification?.status === 'verified',
    firstName: user.first_name,
    lastName: user.last_name,
    imageUrl: user.image_url,
    signInMethods: [
      ...(user.password_enabled ? ['password'] : []),
      ...user.external_accounts.map(a => (a.provider.startsWith('oauth_') ? a.provider : `oauth_${a.provider}`)),
    ],
  };
}

/** Permanently deletes the Clerk user, which also ends all of their sessions. */
export async function deleteClerkUser(userId: string) {
  const response = await fetch(`${CLERK_API_URL}/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Clerk user deletion failed: ${response.status} ${await response.text()}`);
  }
}
