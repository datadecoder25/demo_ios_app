/**
 * POST /api/analyze-meal
 * Server-only (Expo API route): secrets below never reach the client bundle.
 *
 * Body: multipart/form-data with a `photo` image file.
 * Auth: `Authorization: Bearer <Neon Auth JWT>`.
 *
 * Stores the photo in Neon object storage, runs the `analyze-meal` Trigger.dev task on a
 * short-lived presigned URL, and returns { analysis, photoKey }.
 */

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createRemoteJWKSet, jwtVerify } from 'jose';

import type { AnalyzeMealOutput, AnalyzeMealPayload } from '@/trigger/analyze-meal';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ANALYSIS_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 1000;

// Trigger.dev's REST API is used directly: the SDK's dynamic import("uncrypto") breaks
// inside Metro-bundled API routes ("Requiring unknown module").
const TRIGGER_API_URL = 'https://api.trigger.dev';
const TERMINAL_STATUSES = new Set([
  'COMPLETED', 'CANCELED', 'FAILED', 'CRASHED', 'INTERRUPTED', 'SYSTEM_FAILURE', 'EXPIRED', 'TIMED_OUT',
]);

interface TriggerRun {
  id: string;
  status: string;
  output?: AnalyzeMealOutput;
}

async function triggerApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${TRIGGER_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.TRIGGER_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`Trigger.dev API ${path} failed: ${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

/** Triggers analyze-meal and polls until it finishes; resolves to null on timeout. */
async function runAnalyzeMeal(payload: AnalyzeMealPayload): Promise<TriggerRun | null> {
  const { id } = await triggerApi<{ id: string }>('/api/v1/tasks/analyze-meal/trigger', {
    method: 'POST',
    body: JSON.stringify({ payload }),
  });

  const deadline = Date.now() + ANALYSIS_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const run = await triggerApi<TriggerRun>(`/api/v3/runs/${id}`);
    if (TERMINAL_STATUSES.has(run.status)) return run;
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  console.error(`analyze-meal run ${id} did not finish within ${ANALYSIS_TIMEOUT_MS}ms`);
  return null;
}

const authUrl = process.env.EXPO_PUBLIC_NEON_AUTH_URL;
const authOrigin = authUrl ? new URL(authUrl).origin : undefined;
const jwks = authUrl ? createRemoteJWKSet(new URL(`${authUrl}/.well-known/jwks.json`)) : undefined;

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

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

async function getUserId(request: Request): Promise<string | null> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || !jwks || !authOrigin) return null;

  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: authOrigin, audience: authOrigin });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!jwks || !bucket || !process.env.TRIGGER_SECRET_KEY) {
    console.error('analyze-meal: missing EXPO_PUBLIC_NEON_AUTH_URL, NEON_STORAGE_BUCKET or TRIGGER_SECRET_KEY');
    return json({ message: 'Meal analysis is not configured on the server.' }, 500);
  }

  const userId = await getUserId(request);
  if (!userId) {
    return json({ message: 'Please sign in to analyze meals.' }, 401);
  }

  let photo: File | null = null;
  try {
    // React Native's FormData typings lack the server-side get(); this runs in Node.
    const form = (await request.formData()) as unknown as { get(name: string): unknown };
    const value = form.get('photo');
    photo = value instanceof File ? value : null;
  } catch {
    // Fall through to the validation below.
  }
  if (!photo || !photo.type.startsWith('image/')) {
    return json({ message: 'Attach a meal photo as the "photo" field.' }, 400);
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return json({ message: 'Photo is too large (max 10 MB).' }, 413);
  }

  const extension = photo.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const photoKey = `meals/${userId}/${crypto.randomUUID()}.${extension}`;

  try {
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: photoKey,
      Body: new Uint8Array(await photo.arrayBuffer()),
      ContentType: photo.type,
    }));

    // OpenAI downloads the photo itself, so hand it a short-lived read link.
    const imageUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: photoKey }), {
      expiresIn: 15 * 60,
    });

    const run = await runAnalyzeMeal({ imageUrl });

    if (!run) {
      return json({ message: 'Analysis is taking longer than expected. Please try again.' }, 504);
    }
    if (run.status !== 'COMPLETED' || !run.output) {
      console.error(`analyze-meal run ${run.id} ended with status ${run.status}`);
      return json({ message: 'We could not analyze this photo. Please try a clearer one.', runId: run.id }, 502);
    }

    return json({ analysis: run.output, photoKey });
  } catch (error) {
    console.error('analyze-meal error:', error);
    return json({ message: 'Failed to analyze meal. Please try again.' }, 500);
  }
}
