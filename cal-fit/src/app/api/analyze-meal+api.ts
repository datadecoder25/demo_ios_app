/**
 * POST /api/analyze-meal
 * Server-only (Expo API route): secrets below never reach the client bundle.
 *
 * Body: multipart/form-data with a `photo` image file.
 * Auth: `Authorization: Bearer <Clerk session JWT>`.
 *
 * Checks the user has an AI credit, stores the photo in Neon object storage, runs the
 * `analyze-meal` Trigger.dev task on a short-lived presigned URL, spends the credit only
 * once the analysis succeeds, and returns { analysis, photoKey, creditsLeft }.
 * 402 when the user has no credits left.
 */

import { bearerToken, getUserId, isAuthConfigured, json } from '@/server/auth';
import { creditBalance, spendCredit } from '@/server/credits';
import { isStorageConfigured, readPhoto, signedPhotoUrl, storePhoto } from '@/server/storage';
import type { AnalyzeMealOutput, AnalyzeMealPayload } from '@/trigger/analyze-meal';

const ANALYSIS_TIMEOUT_MS = 90_000;
// A run that no worker picks up within this window means the worker isn't running.
const QUEUE_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 1000;

// Trigger.dev's REST API is used directly: the SDK's dynamic import("uncrypto") breaks
// inside Metro-bundled API routes ("Requiring unknown module").
const TRIGGER_API_URL = 'https://api.trigger.dev';
// Statuses before a worker has started the run.
const WAITING_STATUSES = new Set(['PENDING_VERSION', 'QUEUED', 'DELAYED', 'WAITING_FOR_DEPLOY']);
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

type RunResult = { kind: 'finished'; run: TriggerRun } | { kind: 'not_started' } | { kind: 'timeout' };

/** Triggers analyze-meal and polls until it finishes, stalls in the queue, or times out. */
async function runAnalyzeMeal(payload: AnalyzeMealPayload): Promise<RunResult> {
  const { id } = await triggerApi<{ id: string }>('/api/v1/tasks/analyze-meal/trigger', {
    method: 'POST',
    body: JSON.stringify({ payload }),
  });

  const startedAt = Date.now();
  while (Date.now() - startedAt < ANALYSIS_TIMEOUT_MS) {
    const run = await triggerApi<TriggerRun>(`/api/v3/runs/${id}`);
    if (TERMINAL_STATUSES.has(run.status)) return { kind: 'finished', run };

    if (WAITING_STATUSES.has(run.status) && Date.now() - startedAt > QUEUE_TIMEOUT_MS) {
      console.error(`analyze-meal run ${id} still ${run.status} after ${QUEUE_TIMEOUT_MS}ms; is the Trigger.dev worker running?`);
      // Cancel so it doesn't run (and cost an OpenAI call) whenever a worker comes back.
      await triggerApi(`/api/v2/runs/${id}/cancel`, { method: 'POST' }).catch(() => {});
      return { kind: 'not_started' };
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  console.error(`analyze-meal run ${id} did not finish within ${ANALYSIS_TIMEOUT_MS}ms`);
  return { kind: 'timeout' };
}

export async function POST(request: Request) {
  if (!isAuthConfigured || !isStorageConfigured || !process.env.TRIGGER_SECRET_KEY) {
    console.error('analyze-meal: missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY, NEON_STORAGE_BUCKET or TRIGGER_SECRET_KEY');
    return json({ message: 'Meal analysis is not configured on the server.' }, 500);
  }

  const userId = await getUserId(request);
  if (!userId) {
    return json({ message: 'Please sign in to analyze meals.' }, 401);
  }

  const result = await readPhoto(request);
  if ('error' in result) {
    return json({ message: result.error }, result.status);
  }

  const token = bearerToken(request) as string;
  try {
    if ((await creditBalance(token)) < 1) {
      return json({ message: 'You have no AI scans left this month.', code: 'NO_CREDITS' }, 402);
    }

    const photoKey = await storePhoto('meals', userId, result.photo);
    // OpenAI downloads the photo itself, so hand it a short-lived read link.
    const imageUrl = await signedPhotoUrl(photoKey, 15 * 60);

    const outcome = await runAnalyzeMeal({ imageUrl });

    if (outcome.kind === 'not_started') {
      return json({ message: 'The AI service is unavailable right now. Please try again in a few minutes.' }, 503);
    }
    if (outcome.kind === 'timeout') {
      return json({ message: 'Analysis is taking longer than expected. Please try again.' }, 504);
    }
    const { run } = outcome;
    if (run.status !== 'COMPLETED' || !run.output) {
      console.error(`analyze-meal run ${run.id} ended with status ${run.status}`);
      return json({ message: 'We could not analyze this photo. Please try a clearer one.', runId: run.id }, 502);
    }

    // Spent after the fact, so failed or timed-out analyses never cost a credit.
    const creditsLeft = await spendCredit(token, photoKey);
    if (creditsLeft < 0) {
      // Another scan used the last credit while this one ran.
      return json({ message: 'You have no AI scans left this month.', code: 'NO_CREDITS' }, 402);
    }

    return json({ analysis: run.output, photoKey, creditsLeft });
  } catch (error) {
    console.error('analyze-meal error:', error);
    return json({ message: 'Failed to analyze meal. Please try again.' }, 500);
  }
}
