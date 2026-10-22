/**
 * Food shapes shared by the Foods tab, the log-food modal and the /api/foods-search route.
 */

export interface Nutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

/** One product from /api/foods-search (Open Food Facts); nutrients are per 100 g. */
export interface FoodSearchResult {
  id: string;
  name: string;
  brand: string | null;
  servingLabel: string | null;
  servingGrams: number | null;
  per100g: Nutrients;
}

export type FoodSource = 'openfoodfacts' | 'common' | 'recent' | 'custom';

/**
 * What the log-food modal receives (as a JSON route param). `nutrients` are for one serving;
 * `servingGrams` is set when the serving has a known weight, which enables the grams input.
 */
export interface FoodDraft {
  name: string;
  brand?: string | null;
  source: FoodSource;
  servingLabel: string;
  servingGrams: number | null;
  nutrients: Nutrients;
}

const ZERO: Nutrients = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

/** Multiplies every nutrient by `factor`, rounding grams to 0.1 and calories to whole numbers. */
export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  const r1 = (v: number) => Math.round(v * factor * 10) / 10;
  return {
    calories: Math.round(n.calories * factor),
    protein: r1(n.protein),
    carbs: r1(n.carbs),
    fat: r1(n.fat),
    fiber: r1(n.fiber),
  };
}

/** Reads nutrients from a meal's analysis_json, tolerating missing or string values. */
export function nutrientsOf(analysis: any): Nutrients {
  if (!analysis) return ZERO;
  return {
    calories: Number(analysis.calories) || 0,
    protein: Number(analysis.protein) || 0,
    carbs: Number(analysis.carbs) || 0,
    fat: Number(analysis.fat) || 0,
    fiber: Number(analysis.fiber) || 0,
  };
}

/** A search result as a draft: one serving is the labelled serving if known, else 100 g. */
export function draftFromSearch(food: FoodSearchResult): FoodDraft {
  const grams = food.servingGrams ?? 100;
  return {
    name: food.name,
    brand: food.brand,
    source: 'openfoodfacts',
    servingLabel: food.servingLabel ?? `${grams} g`,
    servingGrams: grams,
    nutrients: scaleNutrients(food.per100g, grams / 100),
  };
}
