import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useUser } from '@/contexts/UserContext';
import { nextCreditRenewal } from '@/hooks/useCredits';
import { AiAnalysisResponse, NoCreditsError, triggerAiAnalysis } from '@/lib/ai';
import { scaleNutrients } from '@/components/foods/types';
import { ANALYSIS_CREDIT_COST, creditTransactionApi, imageCacheApi, mealApi, MealType } from '@/lib/db';

export type AnalysisStatus = 'idle' | 'scanning' | 'done' | 'error';

interface AnalysisResult {
  uri: string;
  analysis?: AiAnalysisResponse;
  /** Storage key of the uploaded photo; null when the analysis came from the cache. */
  photoKey?: string | null;
  error?: string;
  insufficientCredits?: boolean;
}

const NO_CREDITS_MESSAGE = () =>
  `You've used this month's free AI scans. They renew on ${nextCreditRenewal().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}. Get a scan pack to keep going now; manual logging is always free.`;

async function sumCredits(userId: string): Promise<number | null> {
  const { data } = await creditTransactionApi.getByUserId(userId);
  return data ? data.reduce((sum, tx) => sum + tx.amount, 0) : null;
}

/** SHA-256 of the photo's bytes. React Native has no crypto.subtle, so expo-crypto does it. */
async function hashImage(uri: string): Promise<string> {
  const bytes =
    Platform.OS === 'web'
      ? new Uint8Array(await (await (await fetch(uri)).blob()).arrayBuffer())
      : await new File(uri).bytes();
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** "grilled chicken" → "Grilled chicken meal"; falls back to "Your meal". */
export function mealTitle(analysis: AiAnalysisResponse | undefined): string {
  const first = analysis?.ingredients?.[0]?.trim();
  if (!first) return 'Your meal';
  return `${first.charAt(0).toUpperCase()}${first.slice(1)} meal`;
}

/**
 * Analyzes a local meal photo once per URI: cache lookup by SHA-256, otherwise upload +
 * AI analysis via /api/analyze-meal and a credit deduction. Saving to the diary is explicit.
 */
export function useMealAnalysis(imageUri: string | null) {
  const { user } = useUser();
  const [credits, setCredits] = useState<number | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const startedFor = useRef<string | null>(null);

  // Balance for the pick screen's credits pill.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadCredits() {
      if (!user) return;
      const total = await sumCredits(user.id);
      if (!cancelled && total !== null) setCredits(total);
    }

    loadCredits();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Runs once per image. Credits are fetched inline so balance updates don't re-trigger it.
  useEffect(() => {
    if (!imageUri || startedFor.current === imageUri) return;
    startedFor.current = imageUri;
    const uri = imageUri;

    async function analyze() {
      if (!user) {
        // Deferred so no state is set synchronously inside the effect.
        await Promise.resolve();
        setResult({ uri, error: 'Please sign in to analyze meals.' });
        return;
      }

      try {
        // The cache only saves a scan, so a photo that can't be hashed is analyzed normally.
        const hash = await hashImage(uri).catch(error => {
          console.warn('Could not hash photo; skipping the analysis cache:', error);
          return null;
        });
        const cached = hash ? (await imageCacheApi.getByHash(hash)).data : null;
        if (cached && cached.length > 0) {
          setResult({ uri, analysis: cached[0].analysis_json, photoKey: null });
          return;
        }

        // Checked here to skip a pointless upload; the server enforces it either way.
        const balance = (await sumCredits(user.id)) ?? 0;
        setCredits(balance);
        if (balance < ANALYSIS_CREDIT_COST) {
          setResult({ uri, error: NO_CREDITS_MESSAGE(), insufficientCredits: true });
          return;
        }

        // The server spends the credit once the analysis succeeds.
        const { analysis, photoKey, creditsLeft } = await triggerAiAnalysis(uri);
        if (hash) await imageCacheApi.create(photoKey, hash, analysis);

        setCredits(creditsLeft);
        setResult({ uri, analysis, photoKey });
      } catch (err) {
        console.error('Analysis error:', err);
        if (err instanceof NoCreditsError) {
          setCredits(0);
          setResult({ uri, error: NO_CREDITS_MESSAGE(), insufficientCredits: true });
          return;
        }
        setResult({
          uri,
          error: err instanceof Error ? err.message : 'Failed to analyze meal. Please try again.',
        });
      }
    }

    analyze();
  }, [imageUri, user]);

  const current = imageUri && result?.uri === imageUri ? result : null;
  const status: AnalysisStatus = !imageUri ? 'idle' : !current ? 'scanning' : current.error ? 'error' : 'done';

  /** Saves the analyzed meal, with the user's name, meal type and portion (scales the estimate). */
  async function saveToDiary(overrides?: { name?: string; mealType?: MealType; portion?: number }): Promise<boolean> {
    if (!user || !current?.analysis) return false;

    const analysis = current.analysis;
    const portion = overrides?.portion && overrides.portion > 0 ? overrides.portion : 1;
    const scaled =
      portion === 1
        ? analysis
        : {
            ...analysis,
            ...scaleNutrients(
              { calories: analysis.calories, protein: analysis.protein, carbs: analysis.carbs, fat: analysis.fat, fiber: analysis.fiber ?? 0 },
              portion
            ),
            // Kept so the original AI estimate can be recovered.
            portion,
          };

    setIsSaving(true);
    setSaveError(null);
    const { data, error } = await mealApi.create({
      user_id: user.id,
      photo_url: current.photoKey ?? null,
      analysis_json: scaled,
      is_manual: false,
      manual_name: overrides?.name?.trim() || mealTitle(analysis),
      meal_type: overrides?.mealType ?? null,
    });
    setIsSaving(false);

    if (error || !data?.[0]) {
      setSaveError('Could not save this meal. Please try again.');
      return false;
    }
    return true;
  }

  return {
    status,
    credits,
    analysis: current?.analysis,
    error: current?.error ?? null,
    insufficientCredits: !!current?.insufficientCredits,
    saveToDiary,
    isSaving,
    saveError,
  };
}
