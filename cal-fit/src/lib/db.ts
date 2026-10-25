/**
 * Database utilities for Neon Postgres
 * Uses the Neon Data API (PostgREST) with the signed-in user's Clerk session JWT.
 * Row-Level Security in db/schema.sql scopes every query to that user.
 */

import { clearAccessToken, getAccessToken } from '@/lib/auth';

const NEON_API_URL = process.env.EXPO_PUBLIC_NEON_API_URL;

interface DbResponse<T> {
  data: T[] | null;
  error: Error | null;
}

const RETRY_DELAY_MS = 800;

// Writes that change streaks or XP (meals, weigh-ins, habits) notify these, so every mounted
// useStats reloads after the write lands instead of waiting for its screen to regain focus.
const statsListeners = new Set<() => void>();

/** Subscribes to stats-changing writes; returns the unsubscribe function. */
export function onStatsChanged(listener: () => void) {
  statsListeners.add(listener);
  return () => {
    statsListeners.delete(listener);
  };
}

async function changesStats<T>(request: Promise<DbResponse<T>>): Promise<DbResponse<T>> {
  const result = await request;
  if (!result.error) statsListeners.forEach(listener => listener());
  return result;
}

async function fetchNeon<T>(endpoint: string, options?: RequestInit, attempt = 0): Promise<DbResponse<T>> {
  if (!NEON_API_URL) {
    console.error('Neon API URL not configured');
    return { data: null, error: new Error('Neon API not configured') };
  }

  // Retries once on network errors, 5xx (e.g. a stale Data API schema cache) and 401
  // (an expired JWT, refreshed first), so a brief hiccup doesn't blank a screen.
  const retry = async () => {
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    return fetchNeon<T>(endpoint, options, attempt + 1);
  };

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

    let response: Response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (networkError) {
      if (attempt === 0) return retry();
      throw networkError;
    }

    if (!response.ok) {
      if (attempt === 0 && (response.status === 401 || response.status >= 500)) {
        if (response.status === 401) await clearAccessToken();
        return retry();
      }
      const detail = (await response.text().catch(() => '')).slice(0, 300);
      throw new Error(`Neon API error: ${response.status} ${response.statusText} ${detail}`.trim());
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
  /** Consent to marketing emails; the database stamps marketing_opt_in_at itself. */
  marketing_opt_in: boolean;
  marketing_opt_in_at: string | null;
  /** Version of the Terms/Privacy Policy agreed to in onboarding; the database stamps the time. */
  terms_version: string | null;
  terms_accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileInput = Partial<
  Omit<Profile, 'id' | 'user_id' | 'marketing_opt_in_at' | 'terms_accepted_at' | 'created_at' | 'updated_at'>
>;

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

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Meal {
  id: string;
  user_id: string;
  photo_url: string | null;
  analysis_json: any | null;
  created_at: string;
  is_manual: boolean;
  manual_name: string | null;
  meal_type: MealType | null;
}

export const mealApi = {
  /** Meals created at or after `since` (ISO timestamp), newest first. */
  async getSince(userId: string, since: string) {
    return fetchNeon<Meal>(
      `meal?user_id=eq.${userId}&is_deleted=eq.false&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc`
    );
  },

  /** The most recent meals, newest first (for "Recent" foods and history). */
  async getRecent(userId: string, limit = 50) {
    return fetchNeon<Meal>(`meal?user_id=eq.${userId}&is_deleted=eq.false&order=created_at.desc&limit=${limit}`);
  },

  async getById(id: string) {
    return fetchNeon<Meal>(`meal?id=eq.${id}`);
  },

  async create(data: {
    user_id: string;
    photo_url?: string | null;
    analysis_json?: any | null;
    is_manual: boolean;
    manual_name?: string | null;
    meal_type?: MealType | null;
  }) {
    return changesStats(fetchNeon<Meal>('meal', {
      method: 'POST',
      body: JSON.stringify(data),
    }));
  },

  async update(id: string, data: Partial<{
    analysis_json: any | null;
    manual_name: string | null;
    meal_type: MealType | null;
  }>) {
    return changesStats(fetchNeon<Meal>(`meal?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }));
  },

  async delete(id: string) {
    return changesStats(fetchNeon<Meal>(`meal?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_deleted: true }),
    }));
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

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  photo_key: string | null;
  logged_at: string;
}

export const weightApi = {
  /** All check-ins, oldest first. */
  async list(userId: string) {
    return fetchNeon<WeightLog>(`weight_log?user_id=eq.${userId}&order=logged_at.asc`);
  },

  async create(data: { weight_kg: number; photo_key?: string | null; logged_at?: string }) {
    return changesStats(fetchNeon<WeightLog>('weight_log', {
      method: 'POST',
      body: JSON.stringify(data),
    }));
  },

  async delete(id: string) {
    return changesStats(fetchNeon<WeightLog>(`weight_log?id=eq.${id}`, { method: 'DELETE' }));
  },
};

export type Habit = 'water' | 'workout';

export interface HabitLog {
  id: string;
  user_id: string;
  day: string;
  habit: Habit;
  amount: number;
}

export const habitApi = {
  /** Habit rows for local days in [fromDay, toDay] (YYYY-MM-DD). */
  async getRange(userId: string, fromDay: string, toDay: string) {
    return fetchNeon<HabitLog>(`habit_log?user_id=eq.${userId}&day=gte.${fromDay}&day=lte.${toDay}`);
  },

  /** Sets the day's amount for a habit (ml of water, or 1/0 for a workout). */
  async set(userId: string, day: string, habit: Habit, amount: number) {
    return changesStats(fetchNeon<HabitLog>('habit_log?on_conflict=user_id,day,habit', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify({ user_id: userId, day, habit, amount: Math.max(0, amount), updated_at: new Date().toISOString() }),
    }));
  },
};

export interface UserStats {
  current_streak: number;
  best_streak: number;
  logged_today: boolean;
  days_logged: number;
  meals_logged: number;
  days_on_target: number;
  weigh_ins: number;
  workouts: number;
  xp: number;
}

export const statsApi = {
  /** Streaks and XP, with days counted in the device's time zone (see user_stats in db/schema.sql). */
  async get() {
    let tz = 'UTC';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      // Keep UTC.
    }
    const { data, error } = await fetchNeon<UserStats>('rpc/user_stats', {
      method: 'POST',
      body: JSON.stringify({ tz }),
    });
    // A scalar-returning RPC comes back as a bare object, not an array.
    return { data: (data as unknown as UserStats | null) ?? null, error };
  },
};
