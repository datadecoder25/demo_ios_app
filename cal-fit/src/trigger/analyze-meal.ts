import { task } from "@trigger.dev/sdk";

/**
 * Analyzes a meal photo with OpenAI and returns the 5 core macros.
 * Runs on Trigger.dev, so OPENAI_API_KEY stays server-side (set it in the Trigger.dev
 * dashboard's environment variables, or in .env for `trigger.dev dev`).
 * Output matches AiAnalysisResponse in src/lib/ai.ts.
 */

export interface AnalyzeMealPayload {
  imageUrl: string;
}

export interface AnalyzeMealOutput {
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
}

const PROMPT = `You are a nutrition expert. Analyze the meal in this image and estimate its nutrition.
Respond with JSON only, using exactly these keys:
{
  "calories": number (kcal),
  "protein": number (g),
  "carbs": number (g),
  "fat": number (g),
  "fiber": number (g),
  "confidence": { "calories": 0-1, "protein": 0-1, "carbs": 0-1, "fat": 0-1, "fiber": 0-1 },
  "ingredients": string[],
  "estimatedServingSize": string
}`;

export const analyzeMeal = task({
  id: "analyze-meal",
  maxDuration: 120,
  run: async (payload: AnalyzeMealPayload): Promise<AnalyzeMealOutput> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    if (!payload.imageUrl) {
      throw new Error("imageUrl is required");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: payload.imageUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content) as AnalyzeMealOutput;

    for (const key of ["calories", "protein", "carbs", "fat", "fiber"] as const) {
      if (typeof result[key] !== "number") {
        throw new Error(`OpenAI response is missing a numeric "${key}"`);
      }
    }

    return result;
  },
});
