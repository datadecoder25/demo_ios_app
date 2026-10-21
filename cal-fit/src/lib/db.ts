/**
 * Database utilities for Neon Postgres
 * Uses REST API via Supabase Client or direct fetch
 */

import { Platform } from 'react-native';

const NEON_API_URL = process.env.EXPO_PUBLIC_NEON_API_URL;
const NEON_API_KEY = process.env.EXPO_PUBLIC_NEON_API_KEY;

interface DbResponse<T> {
  data: T[] | null;
  error: Error | null;
}

async function fetchNeon<T>(endpoint: string, options?: RequestInit): Promise<DbResponse<T>> {
  if (!NEON_API_URL || !NEON_API_KEY) {
    console.error('Neon API URL or Key not configured');
    return { data: null, error: new Error('Neon API not configured') };
  }

  try {
    const url = `${NEON_API_URL}/${endpoint}`;
    const headers = {
      'apikey': NEON_API_KEY,
      'Content-Type': 'application/json',
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

export const userApi = {
  async getByClerkId(clerkId: string) {
    return fetchNeon<{ id: string; clerk_id: string; anonymous_id: string | null }>(
      `users?clerk_id=eq.${clerkId}`
    );
  },

  async create(clerkId: string, anonymousId: string | null = null) {
    return fetchNeon<{ id: string }>('users', {
      method: 'POST',
      body: JSON.stringify({ clerk_id: clerkId, anonymous_id: anonymousId }),
    });
  },

  async merge(guestId: string, loggedInId: string) {
    await fetchNeon<null>(`meal?user_id=eq.${guestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ user_id: loggedInId }),
    });

    return fetchNeon<null>(`users?id=eq.${guestId}`, {
      method: 'DELETE',
    });
  },
};

export const profileApi = {
  async getByUserId(userId: string) {
    return fetchNeon<{
      id: string;
      user_id: string;
      age: number | null;
      height: number | null;
      weight: number | null;
      activity_level: string | null;
      medical_conditions: string | null;
      goal: string | null;
      unit_preference: 'imperial' | 'metric';
      daily_calorie_target: number | null;
      created_at: string;
      updated_at: string;
    }>(`profile?user_id=eq.${userId}`);
  },

  async upsert(userId: string, data: Partial<{
    age: number;
    height: number;
    weight: number;
    activity_level: string;
    medical_conditions: string;
    goal: string;
    unit_preference: 'imperial' | 'metric';
    daily_calorie_target: number;
  }>) {
    return fetchNeon<{ id: string }>('profile', {
      method: 'POST',
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

  async addCredits(userId: string, amount: number, type: 'free' | 'purchase' = 'free') {
    return fetchNeon<{ id: string }>('credit_transaction', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, amount, type }),
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
