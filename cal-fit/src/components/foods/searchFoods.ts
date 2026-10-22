import { apiUrl } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

import type { FoodSearchResult } from './types';

/** Searches the food database through /api/foods-search; throws with a user-facing message. */
export async function searchFoods(query: string, signal?: AbortSignal): Promise<FoodSearchResult[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in again to search foods.');

  const response = await fetch(apiUrl(`/api/foods-search?q=${encodeURIComponent(query)}`), {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || 'Food search failed. Please try again.');
  }
  return (data?.foods ?? []) as FoodSearchResult[];
}
