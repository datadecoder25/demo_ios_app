/**
 * AI meal analysis. The app sends the photo to the /api/analyze-meal server route, which
 * stores it and runs the `analyze-meal` Trigger.dev task (OpenAI) with server-side keys.
 */

import { apiUrl } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { appendPhoto } from '@/lib/photos';

export interface AiAnalysisResponse {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidence?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  };
  ingredients?: string[];
  estimatedServingSize?: string;
  analysisId?: string;
}

export interface MealAnalysisResult {
  analysis: AiAnalysisResponse;
  /** Object-storage key of the uploaded photo; saved as the meal's photo_url. */
  photoKey: string;
  /** Balance after the server spent this scan's credit. */
  creditsLeft: number;
}

/** The server refused the scan because the user has no credits left (HTTP 402). */
export class NoCreditsError extends Error {}

/** Uploads a local photo (file:// on native, blob: on web) and returns its analysis. */
export async function triggerAiAnalysis(localImageUri: string): Promise<MealAnalysisResult> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Please sign in to analyze meals.');
  }

  const formData = new FormData();
  await appendPhoto(formData, localImageUri);

  try {
    const response = await fetch(apiUrl('/api/analyze-meal'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await response.json().catch(() => null);
    if (response.status === 402) {
      throw new NoCreditsError(data?.message || 'You have no AI scans left this month.');
    }
    if (!response.ok) {
      throw new Error(data?.message || `AI analysis failed: ${response.status}`);
    }
    if (!validateAiResponse(data?.analysis)) {
      throw new Error('AI analysis returned an unexpected response.');
    }

    return data as MealAnalysisResult;
  } catch (error) {
    console.error('AI analysis error:', error);
    throw error;
  }
}

export function validateAiResponse(data: any): data is AiAnalysisResponse {
  const requiredFields = ['calories', 'protein', 'carbs', 'fat', 'fiber'];
  return requiredFields.every(field => typeof data[field] === 'number');
}
