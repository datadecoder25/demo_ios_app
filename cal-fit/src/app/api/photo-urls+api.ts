/**
 * POST /api/photo-urls
 * Body: { keys: string[] } (max 50). Auth: Clerk session JWT.
 * Returns { urls: { [key]: signedUrl } } for the keys the caller owns; other keys are left out.
 */

import { getUserId, isAuthConfigured, json } from '@/server/auth';
import { isStorageConfigured, ownsKey, signedPhotoUrl } from '@/server/storage';
import { photoOwnerIds } from '@/server/users';

const MAX_KEYS = 50;

export async function POST(request: Request) {
  if (!isAuthConfigured || !isStorageConfigured) {
    return json({ message: 'Photo storage is not configured on the server.' }, 500);
  }

  const userId = await getUserId(request);
  if (!userId) {
    return json({ message: 'Please sign in.' }, 401);
  }

  const body = (await request.json().catch(() => null)) as { keys?: unknown } | null;
  const keys = Array.isArray(body?.keys) ? body.keys.filter((k): k is string => typeof k === 'string') : null;
  if (!keys || keys.length > MAX_KEYS) {
    return json({ message: `Send { keys: string[] } with at most ${MAX_KEYS} keys.` }, 400);
  }

  const ownerIds = await photoOwnerIds(userId);
  const owned = keys.filter(key => ownsKey(ownerIds, key));
  const urls = Object.fromEntries(
    await Promise.all(owned.map(async key => [key, await signedPhotoUrl(key)] as const))
  );
  return json({ urls });
}
