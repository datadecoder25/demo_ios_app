/**
 * AI Analysis integration with Trigger.dev and OpenAI
 */

const TRIGGER_DEV_URL = process.env.EXPO_PUBLIC_TRIGGER_DEV_URL;
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

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

export async function triggerAiAnalysis(imageUrl: string): Promise<AiAnalysisResponse> {
  if (!TRIGGER_DEV_URL) {
    throw new Error('Trigger.dev URL not configured');
  }

  try {
    const response = await fetch(TRIGGER_DEV_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl,
        apiKey: OPENAI_API_KEY,
        model: 'gpt-4o-mini',
        prompt: `Analyze this meal image and return JSON with: calories (kcal), protein (g), carbs (g), fat (g), fiber (g). Include confidence scores for each estimate.`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`AI analysis failed: ${errorData.message}`);
    }

    const data = await response.json();
    return data as AiAnalysisResponse;
  } catch (error) {
    console.error('AI analysis error:', error);
    throw error;
  }
}

export function validateAiResponse(data: any): data is AiAnalysisResponse {
  const requiredFields = ['calories', 'protein', 'carbs', 'fat', 'fiber'];
  return requiredFields.every(field => typeof data[field] === 'number');
}
