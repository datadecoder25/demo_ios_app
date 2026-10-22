/**
 * Onboarding options and daily target math shared by onboarding, home and progress.
 * Values are metric (cm, kg), matching the design.
 */

import type { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

export const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', subtitle: 'Little to no exercise', icon: 'walk-outline', multiplier: 1.2 },
  { value: 'lightly_active', label: 'Lightly Active', subtitle: '1-3 days/week', icon: 'bicycle-outline', multiplier: 1.375 },
  { value: 'moderately_active', label: 'Moderately Active', subtitle: '3-5 days/week', icon: 'fitness-outline', multiplier: 1.55 },
  { value: 'very_active', label: 'Very Active', subtitle: '6+ days/week', icon: 'flash-outline', multiplier: 1.725 },
] as const satisfies readonly { value: string; label: string; subtitle: string; icon: IconName; multiplier: number }[];

export const GYM_EXPERIENCE = [
  { value: 'none', label: 'None', subtitle: "I'm new to the gym", icon: 'body-outline' },
  { value: 'beginner', label: 'Beginner', subtitle: 'Less than 6 months', icon: 'walk-outline' },
  { value: 'intermediate', label: 'Intermediate', subtitle: '6 months - 2 years', icon: 'barbell-outline' },
  { value: 'advanced', label: 'Advanced', subtitle: 'More than 2 years', icon: 'trophy-outline' },
] as const satisfies readonly { value: string; label: string; subtitle: string; icon: IconName }[];

export const GOALS = [
  { value: 'gain_weight', label: 'Gain Weight', icon: 'person-add-outline', calorieDelta: 400 },
  { value: 'build_muscle', label: 'Build Muscle', icon: 'barbell-outline', calorieDelta: 300 },
  { value: 'get_stronger', label: 'Get Stronger', icon: 'flash-outline', calorieDelta: 200 },
  { value: 'improve_health', label: 'Improve Health', icon: 'heart-outline', calorieDelta: 0 },
] as const satisfies readonly { value: string; label: string; icon: IconName; calorieDelta: number }[];

export type Gender = 'male' | 'female';
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number]['value'];
export type GymExperience = (typeof GYM_EXPERIENCE)[number]['value'];
export type Goal = (typeof GOALS)[number]['value'];

/** Fallback age for profiles created before onboarding asked for it. */
export const DEFAULT_AGE = 25;

/** Macro split shown on the Calorie Target Result screen (share of calories). */
export const MACRO_SPLIT = { protein: 0.22, carbs: 0.6, fat: 0.18 } as const;

export interface TargetInput {
  gender: Gender;
  heightCm: number;
  weightKg: number;
  goalWeightKg?: number | null;
  activityLevel: string;
  goal: string;
  age?: number | null;
}

export interface DailyTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Mifflin-St Jeor BMR × activity multiplier, adjusted for the goal. */
export function calculateTargets(input: TargetInput): DailyTargets {
  const age = input.age ?? DEFAULT_AGE;
  const bmr =
    10 * input.weightKg + 6.25 * input.heightCm - 5 * age + (input.gender === 'male' ? 5 : -161);
  const multiplier = ACTIVITY_LEVELS.find(a => a.value === input.activityLevel)?.multiplier ?? 1.2;

  let delta: number = GOALS.find(g => g.value === input.goal)?.calorieDelta ?? 0;
  // A goal weight below the current weight means a deficit, whatever the goal type.
  if (input.goalWeightKg && input.goalWeightKg < input.weightKg) delta = -400;

  const calories = Math.round((bmr * multiplier + delta) / 10) * 10;
  return {
    calories,
    ...macrosFor(calories),
  };
}

/** Grams of each macro for a calorie target, using MACRO_SPLIT. */
export function macrosFor(calories: number) {
  return {
    protein: Math.round((calories * MACRO_SPLIT.protein) / 4),
    carbs: Math.round((calories * MACRO_SPLIT.carbs) / 4),
    fat: Math.round((calories * MACRO_SPLIT.fat) / 9),
  };
}

/** Sums the macros of analyzed/manual meals (analysis_json holds calories, protein, …). */
export function sumMeals(meals: { analysis_json: any | null }[]): DailyTargets {
  return meals.reduce(
    (total, meal) => ({
      calories: total.calories + (Number(meal.analysis_json?.calories) || 0),
      protein: total.protein + (Number(meal.analysis_json?.protein) || 0),
      carbs: total.carbs + (Number(meal.analysis_json?.carbs) || 0),
      fat: total.fat + (Number(meal.analysis_json?.fat) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/** Midnight today in local time, as an ISO string (for "today's meals" queries). */
export function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** A date as a local YYYY-MM-DD day key (matches habit_log.day and user_stats' tz). */
export function localDay(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Daily water goal; each tap on the home task logs one glass. */
export const WATER_GOAL_ML = 2500;
export const WATER_GLASS_ML = 250;

/** XP needed per level (XP rules live in user_stats, db/schema.sql). */
export const XP_PER_LEVEL = 1000;

export function levelFor(xp: number) {
  return {
    level: Math.floor(xp / XP_PER_LEVEL) + 1,
    progress: (xp % XP_PER_LEVEL) / XP_PER_LEVEL,
    toNext: XP_PER_LEVEL - (xp % XP_PER_LEVEL),
  };
}
