import { useEffect, useRef, useState } from 'react';

import { useUser } from '@/contexts/UserContext';
import { AiAnalysisResponse, triggerAiAnalysis } from '@/lib/ai';
import { ANALYSIS_CREDIT_COST, creditTransactionApi, imageCacheApi, mealApi } from '@/lib/db';

export type AnalysisStatus = 'idle' | 'scanning' | 'done' | 'error';

interface AnalysisResult {
  uri: string;
  analysis?: AiAnalysisResponse;
  /** Storage key of the uploaded photo; null when the analysis came from the cache. */
  photoKey?: string | null;
  error?: string;
  insufficientCredits?: boolean;
}

async function sumCredits(userId: string): Promise<number | null> {
  const { data } = await creditTransactionApi.getByUserId(userId);
  return data ? data.reduce((sum, tx) => sum + tx.amount, 0) : null;
}

async function hashImage(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
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
        const hash = await hashImage(uri);
        const { data: cached } = await imageCacheApi.getByHash(hash);
        if (cached && cached.length > 0) {
          setResult({ uri, analysis: cached[0].analysis_json, photoKey: null });
          return;
        }

        const balance = (await sumCredits(user.id)) ?? 0;
        setCredits(balance);
        if (balance < ANALYSIS_CREDIT_COST) {
          setResult({
            uri,
            error: 'You are out of credits. Get more to keep scanning meals.',
            insufficientCredits: true,
          });
          return;
        }

        const { analysis, photoKey } = await triggerAiAnalysis(uri);
        await creditTransactionApi.deductCredits(user.id, ANALYSIS_CREDIT_COST, photoKey);
        await imageCacheApi.create(photoKey, hash, analysis);

        setCredits(balance - ANALYSIS_CREDIT_COST);
        setResult({ uri, analysis, photoKey });
      } catch (err) {
        console.error('Analysis error:', err);
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

  async function saveToDiary(): Promise<boolean> {
    if (!user || !current?.analysis) return false;

    setIsSaving(true);
    setSaveError(null);
    const { data, error } = await mealApi.create({
      user_id: user.id,
      photo_url: current.photoKey ?? null,
      analysis_json: current.analysis,
      is_manual: false,
      manual_name: mealTitle(current.analysis),
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
