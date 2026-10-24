/**
 * Server-only: photo storage in Neon's S3-compatible object storage.
 * Keys are `<folder>/<userId>/<uuid>.<ext>`, so ownership can be checked from the key alone.
 */

import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
// Formats OpenAI vision accepts; the app re-encodes everything else to JPEG before upload.
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export type PhotoFolder = 'meals' | 'progress';

const bucket = process.env.NEON_STORAGE_BUCKET;
const s3 = new S3Client({
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  region: process.env.AWS_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },
});

export const isStorageConfigured = !!bucket;

/** Reads the multipart `photo` field; returns the file or a user-facing error with its status. */
export async function readPhoto(request: Request): Promise<{ photo: File } | { error: string; status: number }> {
  let photo: File | null = null;
  try {
    // React Native's FormData typings lack the server-side get(); this runs in Node.
    const form = (await request.formData()) as unknown as { get(name: string): unknown };
    const value = form.get('photo');
    photo = value instanceof File ? value : null;
  } catch {
    // Fall through to the validation below.
  }

  if (!photo) {
    return { error: 'Attach a photo as the "photo" field.', status: 400 };
  }
  if (!ALLOWED_TYPES.has(photo.type)) {
    return { error: 'Unsupported photo format. Please use a JPEG or PNG.', status: 415 };
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return { error: 'Photo is too large (max 10 MB).', status: 413 };
  }
  return { photo };
}

/** Stores a photo under the user's folder and returns its key. */
export async function storePhoto(folder: PhotoFolder, userId: string, photo: File): Promise<string> {
  const extension = photo.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const key = `${folder}/${userId}/${crypto.randomUUID()}.${extension}`;
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: new Uint8Array(await photo.arrayBuffer()),
    ContentType: photo.type,
  }));
  return key;
}

/** True when `key` is a photo owned by one of `ownerIds` (the user, plus a linked legacy account). */
export function ownsKey(ownerIds: string[], key: string): boolean {
  const [folder, owner, file, ...rest] = key.split('/');
  return (folder === 'meals' || folder === 'progress') && ownerIds.includes(owner) && !!file && rest.length === 0;
}

/** Deletes every meal and progress photo stored under these owners' folders. */
export async function deleteUserPhotos(ownerIds: string[]) {
  if (!bucket) return;
  for (const owner of ownerIds) {
    for (const folder of ['meals', 'progress'] satisfies PhotoFolder[]) {
      let continuationToken: string | undefined;
      do {
        const page = await s3.send(new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: `${folder}/${owner}/`,
          ContinuationToken: continuationToken,
        }));
        const objects = (page.Contents ?? []).flatMap(object => (object.Key ? [{ Key: object.Key }] : []));
        if (objects.length > 0) {
          await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects, Quiet: true } }));
        }
        continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (continuationToken);
    }
  }
}

/** Short-lived read link for a stored photo. */
export function signedPhotoUrl(key: string, expiresIn = 60 * 60): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}
