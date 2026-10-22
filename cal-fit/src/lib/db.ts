/**
 * Database utilities for Neon Postgres
 * Uses the Neon Data API (PostgREST) with the signed-in user's Neon Auth JWT.
 * Row-Level Security in db/schema.sql scopes every query to that user.
 */

import { getAccessToken } from '@/lib/auth';

const NEON_API_URL = process.env.EXPO_PUBLIC_NEON_API_URL;

interface DbResponse<T> {
  data: T[] | null;
  error: Error | null;
}

async function fetchNeon<T>(endpoint: string, options?: RequestInit): Promise<DbResponse<T>> {
  if (!NEON_API_URL) {
    console.error('Neon API URL not configured');
    return { data: null, error: new Error('Neon API not configured') };
  }

  try {
    const token = await getAccessToken();
    if (!token) {
      return { data: null, error: new Error('Not signed in') };
    }

    const url = `${NEON_API_URL}/${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      // Without this, writes return an empty body and response.json() would throw.
      'Prefer': 'return=representation',
      ...options?.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      throw new Error(`Neon API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as T[];
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export interface Profile {
  id: string;
  user_id: string;
  age: number | null;
  gender: 'male' | 'female' | null;
  height: number | null;
  weight: number | null;
  goal_weight: number | null;
  activity_level: string | null;
  gym_experience: string | null;
  medical_conditions: string | null;
  goal: string | null;
  unit_preference: 'imperial' | 'metric';
  daily_calorie_target: number | null;
  created_at: string;
  updated_at: string;
}

export type ProfileInput = Partial<Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export const profileApi = {
  async getByUserId(userId: string) {
    return fetchNeon<Profile>(`profile?user_id=eq.${userId}`);
  },

  async upsert(userId: string, data: ProfileInput) {
    return fetchNeon<Profile>('profile?on_conflict=user_id', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify({ user_id: userId, ...data }),
    });
  },
};

export const mealApi = {
  async getByUserId(userId: string, date?: string) {
    let endpoint = `meal?user_id=eq.${userId}&is_deleted=eq.false`;
    if (date) {
      endpoint += `&created_at=eq.${date}`;
    }
    return fetchNeon<{
      id: string;
      user_id: string;
      photo_url: string | null;
      analysis_json: any | null;
      created_at: string;
      is_manual: boolean;
      manual_name: string | null;
    }>(endpoint);
  },

  /** Meals created at or after `since` (ISO timestamp), newest first. */
  async getSince(userId: string, since: string) {
    return fetchNeon<{
      id: string;
      user_id: string;
      photo_url: string | null;
      analysis_json: any | null;
      created_at: string;
      is_manual: boolean;
      manual_name: string | null;
    }>(`meal?user_id=eq.${userId}&is_deleted=eq.false&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc`);
  },

  async getById(id: string) {
    return fetchNeon<{
      id: string;
      user_id: string;
      photo_url: string | null;
      analysis_json: any | null;
      created_at: string;
      is_manual: boolean;
      manual_name: string | null;
    }>(`meal?id=eq.${id}`);
  },

  async create(data: {
    user_id: string;
    photo_url?: string | null;
    analysis_json?: any | null;
    is_manual: boolean;
    manual_name?: string | null;
  }) {
    return fetchNeon<{ id: string }>('meal', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<{
    photo_url: string | null;
    analysis_json: any | null;
    manual_name: string | null;
  }>) {
    return fetchNeon<{ id: string }>(`meal?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string) {
    return fetchNeon<null>(`meal?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_deleted: true }),
    });
  },
};

export const mealFoodApi = {
  async getByMealId(mealId: string) {
    return fetchNeon<{
      id: string;
      meal_id: string;
      food_name: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
    }>(`meal_food?meal_id=eq.${mealId}`);
  },

  async create(data: {
    meal_id: string;
    food_name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  }) {
    return fetchNeon<{ id: string }>('meal_food', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

/** Credits spent per AI meal analysis (the free tier grants 4 per month). */
export const ANALYSIS_CREDIT_COST = 1;

export const creditTransactionApi = {
  async getByUserId(userId: string) {
    return fetchNeon<{
      id: string;
      user_id: string;
      amount: number;
      type: 'free' | 'purchase' | 'used' | 'refunded';
      reference_id: string | null;
      created_at: string;
    }>(`credit_transaction?user_id=eq.${userId}&order=created_at.desc`);
  },

  /** Grants the monthly free credits if not yet claimed this month; resolves to the amount granted. */
  async claimFreeCredits() {
    return fetchNeon<number>('rpc/claim_free_credits', {
      method: 'POST',
      body: '{}',
    });
  },

  async deductCredits(userId: string, amount: number, mealId: string) {
    return fetchNeon<{ id: string }>('credit_transaction', {
      method: 'POST',
      body: JSON.stringify({ 
        user_id: userId, 
        amount: -amount, 
        type: 'used',
        reference_id: mealId,
      }),
    });
  },
};

export const imageCacheApi = {
  async getByHash(hash: string) {
    return fetchNeon<{
      id: string;
      image_url: string;
      hash: string;
      analysis_json: any;
      expires_at: string;
    }>(`image_cache?hash=eq.${hash}&expires_at=gt.${new Date().toISOString()}`);
  },

  async create(imageUrl: string, hash: string, analysisJson: any, ttlHours: number = 24) {
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
    return fetchNeon<{ id: string }>('image_cache', {
      method: 'POST',
      body: JSON.stringify({ 
        image_url: imageUrl, 
        hash, 
        analysis_json: analysisJson,
        expires_at: expiresAt,
      }),
    });
  },
};
