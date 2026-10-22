/**
 * GET /api/foods-search?q=<query>
 * Auth: `Authorization: Bearer <Neon Auth JWT>`.
 *
 * Proxies the Open Food Facts search service and returns
 * { foods: FoodSearchResult[] } with nutrients per 100 g. Products without calories are dropped.
 * (The legacy /cgi/search.pl endpoint rejects server traffic, so this uses search.openfoodfacts.org.)
 */

import type { FoodSearchResult } from '@/components/foods/types';
import { getUserId, json } from '@/server/auth';

const SEARCH_URL = 'https://search.openfoodfacts.org/search';
const FIELDS = 'code,product_name,brands,nutriments,serving_size,serving_quantity';
const PAGE_SIZE = 25;
const TIMEOUT_MS = 8000;
const USER_AGENT = 'CalFit/1.0 (calorie tracking app)';

interface OffProduct {
  code?: string;
  product_name?: unknown;
  brands?: unknown;
  serving_size?: unknown;
  serving_quantity?: unknown;
  nutriments?: Record<string, unknown>;
}

function num(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
}

function text(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (Array.isArray(value)) return value.filter(v => typeof v === 'string').join(', ').trim() || null;
  return null;
}

/** Rounds to one decimal place. */
function r1(n: number) {
  return Math.round(n * 10) / 10;
}

function normalize(product: OffProduct): FoodSearchResult | null {
  const name = text(product.product_name);
  const n = product.nutriments ?? {};
  // Some products only list energy in kJ.
  const kcal = num(n['energy-kcal_100g']) ?? (num(n['energy_100g']) !== null ? num(n['energy_100g'])! / 4.184 : null);
  if (!product.code || !name || kcal === null || kcal > 900) return null;

  const servingGrams = num(product.serving_quantity);
  return {
    id: product.code,
    name,
    brand: text(product.brands),
    servingLabel: text(product.serving_size),
    servingGrams: servingGrams && servingGrams > 0 ? servingGrams : null,
    per100g: {
      calories: Math.round(kcal),
      protein: r1(num(n['proteins_100g']) ?? 0),
      carbs: r1(num(n['carbohydrates_100g']) ?? 0),
      fat: r1(num(n['fat_100g']) ?? 0),
      fiber: r1(num(n['fiber_100g']) ?? 0),
    },
  };
}

export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) {
    return json({ message: 'Please sign in to search foods.' }, 401);
  }

  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (query.length < 2) {
    return json({ message: 'Type at least 2 characters to search.' }, 400);
  }
  if (query.length > 100) {
    return json({ message: 'Search is too long.' }, 400);
  }

  const url = `${SEARCH_URL}?${new URLSearchParams({
    q: query,
    page_size: String(PAGE_SIZE),
    langs: 'en',
    fields: FIELDS,
  })}`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`foods-search: Open Food Facts returned ${response.status}`);
      return json({ message: 'Food search is unavailable right now. Please try again shortly.' }, 502);
    }

    const body = (await response.json()) as { hits?: OffProduct[] };
    const seen = new Set<string>();
    const foods = (body.hits ?? [])
      .map(normalize)
      .filter((food): food is FoodSearchResult => {
        if (!food) return false;
        // Many products are listed several times with the same name and brand.
        const key = `${food.name}|${food.brand ?? ''}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    return json({ foods });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    console.error('foods-search error:', error);
    return json(
      { message: timedOut ? 'Food search took too long. Please try again.' : 'Food search failed. Please try again.' },
      timedOut ? 504 : 502
    );
  }
}
