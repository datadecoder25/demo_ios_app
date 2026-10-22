/**
 * POST /api/progress-photo
 * Body: multipart/form-data with a `photo` image. Auth: Neon Auth bearer JWT.
 * Stores the photo under progress/<userId>/ and returns { photoKey }; the app saves the
 * key on a weight_log row.
 */

import { getUserId, isAuthConfigured, json } from '@/server/auth';
import { isStorageConfigured, readPhoto, storePhoto } from '@/server/storage';

export async function POST(request: Request) {
  if (!isAuthConfigured || !isStorageConfigured) {
    return json({ message: 'Photo storage is not configured on the server.' }, 500);
  }

  const userId = await getUserId(request);
  if (!userId) {
    return json({ message: 'Please sign in to upload photos.' }, 401);
  }

  const result = await readPhoto(request);
  if ('error' in result) {
    return json({ message: result.error }, result.status);
  }

  try {
    return json({ photoKey: await storePhoto('progress', userId, result.photo) });
  } catch (error) {
    console.error('progress-photo error:', error);
    return json({ message: 'Could not upload the photo. Please try again.' }, 500);
  }
}
