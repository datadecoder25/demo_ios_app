/**
 * Photo helpers shared by meal scans and progress check-ins.
 *
 * Gallery photos are often huge (12 MP+) or HEIC, which OpenAI can't read, so every picked
 * photo is re-encoded as a JPEG no wider than MAX_PHOTO_EDGE before it's shown or uploaded.
 */

import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { apiUrl } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

const MAX_PHOTO_EDGE = 1600;
const JPEG_QUALITY = 0.8;

export type PhotoKind = 'meal' | 'progress';

const HEIC_TYPES = new Set(['image/heic', 'image/heif']);

/** Browsers other than Safari can't decode HEIC, so convert it to JPEG first (web only). */
async function decodeHeicOnWeb(uri: string, mimeType?: string | null): Promise<string> {
  if (Platform.OS !== 'web') return uri;
  const blob = await (await fetch(uri)).blob();
  const type = mimeType || blob.type;
  if (!HEIC_TYPES.has(type.toLowerCase())) return uri;

  // Loaded on demand: the decoder is large and only needed for HEIC photos.
  const { default: heic2any } = await import('heic2any');
  const converted = await heic2any({ blob, toType: 'image/jpeg', quality: 0.9 });
  return URL.createObjectURL(Array.isArray(converted) ? converted[0] : converted);
}

/** Resizes and re-encodes a picked photo as JPEG; returns the new local URI. */
export async function preparePhoto(
  uri: string,
  width?: number,
  height?: number,
  mimeType?: string | null
): Promise<string> {
  try {
    const source = await decodeHeicOnWeb(uri, mimeType);
    if (source !== uri) {
      // The browser couldn't measure the HEIC original, so let the resize pick the edge.
      width = undefined;
      height = undefined;
    }
    const context = ImageManipulator.manipulate(source);
    const longest = Math.max(width ?? 0, height ?? 0);
    if (!longest || longest > MAX_PHOTO_EDGE) {
      // Unknown size (some web pickers) → constrain the width; the aspect ratio is kept.
      context.resize((height ?? 0) > (width ?? 0) ? { height: MAX_PHOTO_EDGE } : { width: MAX_PHOTO_EDGE });
    }
    const image = await context.renderAsync();
    const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
    return result.uri;
  } catch (error) {
    console.error('preparePhoto failed:', error);
    throw new Error(
      Platform.OS === 'web'
        ? "We couldn't open that photo. Try a JPEG, PNG or HEIC image."
        : "We couldn't open that photo. Please try another one."
    );
  }
}

/** Appends a local photo (file:// on native, blob:/data: on web) to a FormData body. */
export async function appendPhoto(formData: FormData, uri: string) {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    formData.append('photo', blob, 'photo.jpg');
  } else {
    // On phones the global fetch is expo/fetch, which rejects React Native's { uri } parts
    // ("Unsupported FormDataPart implementation"). It reads any part with bytes(), using
    // name and type for the part's headers; preparePhoto always produces a JPEG.
    const file = new File(uri);
    formData.append('photo', { name: 'photo.jpg', type: 'image/jpeg', bytes: () => file.bytes() } as any);
  }
}

/** Uploads a progress photo and returns its storage key. */
export async function uploadProgressPhoto(uri: string): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in again.');

  const formData = new FormData();
  await appendPhoto(formData, uri);
  const response = await fetch(apiUrl('/api/progress-photo'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.photoKey) {
    throw new Error(data?.message || 'Could not upload the photo. Please try again.');
  }
  return data.photoKey;
}

// Signed URLs last an hour on the server; reuse them for 50 minutes.
const URL_TTL_MS = 50 * 60 * 1000;
const urlCache = new Map<string, { url: string; expiresAt: number }>();

/** Resolves storage keys to short-lived image URLs (keys the user doesn't own are skipped). */
export async function getPhotoUrls(keys: string[]): Promise<Record<string, string>> {
  const now = Date.now();
  const result: Record<string, string> = {};
  const missing: string[] = [];

  for (const key of new Set(keys.filter(Boolean))) {
    const cached = urlCache.get(key);
    if (cached && cached.expiresAt > now) result[key] = cached.url;
    else missing.push(key);
  }
  if (missing.length === 0) return result;

  const token = await getAccessToken();
  if (!token) return result;

  try {
    const response = await fetch(apiUrl('/api/photo-urls'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys: missing }),
    });
    if (!response.ok) return result;
    const { urls } = (await response.json()) as { urls: Record<string, string> };
    for (const [key, url] of Object.entries(urls)) {
      urlCache.set(key, { url, expiresAt: now + URL_TTL_MS });
      result[key] = url;
    }
  } catch (error) {
    console.error('getPhotoUrls failed:', error);
  }
  return result;
}
