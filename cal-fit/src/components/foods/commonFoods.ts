/**
 * Common meals with typical per-serving values, shown on the Foods tab when the search box is
 * empty. Real products come from the Open Food Facts search (/api/foods-search).
 */

import type { FoodDraft } from './types';

export type FoodCategory = 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'shakes';

export interface CommonFood {
  id: string;
  name: string;
  emoji: string;
  tint: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export const FOOD_CATEGORIES = [
  { label: 'Breakfast', value: 'breakfast' },
  { label: 'Lunch', value: 'lunch' },
  { label: 'Dinner', value: 'dinner' },
  { label: 'Snacks', value: 'snacks' },
  { label: 'Shakes', value: 'shakes' },
] as const satisfies readonly { label: string; value: FoodCategory }[];

export const COMMON_FOODS: Record<FoodCategory, CommonFood[]> = {
  breakfast: [
    { id: 'oats-bowl', name: 'Oats Bowl', emoji: '🥣', tint: '#FFF4E5', calories: 420, protein: 20, carbs: 62, fat: 11, fiber: 9 },
    { id: 'greek-yogurt', name: 'Greek Yogurt & Berries', emoji: '🫐', tint: '#EEF0FF', calories: 380, protein: 25, carbs: 48, fat: 9, fiber: 6 },
    { id: 'eggs-avocado', name: 'Eggs & Avocado Toast', emoji: '🥑', tint: '#EDF9EE', calories: 460, protein: 26, carbs: 34, fat: 24, fiber: 8 },
    { id: 'protein-pancakes', name: 'Protein Pancakes', emoji: '🥞', tint: '#FFF1E8', calories: 520, protein: 21, carbs: 70, fat: 16, fiber: 4 },
    { id: 'pb-banana-smoothie', name: 'Banana Peanut Butter Smoothie', emoji: '🍌', tint: '#FFF9DB', calories: 450, protein: 18, carbs: 58, fat: 17, fiber: 6 },
  ],
  lunch: [
    { id: 'chicken-rice-bowl', name: 'Grilled Chicken Rice Bowl', emoji: '🍗', tint: '#FFF4E5', calories: 650, protein: 45, carbs: 72, fat: 16, fiber: 6 },
    { id: 'turkey-wrap', name: 'Turkey & Hummus Wrap', emoji: '🌯', tint: '#F3EEE6', calories: 540, protein: 34, carbs: 52, fat: 20, fiber: 7 },
    { id: 'tuna-pasta', name: 'Tuna Pasta Salad', emoji: '🍝', tint: '#FFEFEA', calories: 590, protein: 36, carbs: 68, fat: 18, fiber: 5 },
    { id: 'beef-burrito', name: 'Beef & Bean Burrito', emoji: '🌮', tint: '#FFF1E0', calories: 720, protein: 38, carbs: 80, fat: 26, fiber: 11 },
    { id: 'paneer-bowl', name: 'Paneer Tikka Bowl', emoji: '🍛', tint: '#FFF4E5', calories: 610, protein: 30, carbs: 58, fat: 28, fiber: 6 },
  ],
  dinner: [
    { id: 'salmon-potatoes', name: 'Salmon & Sweet Potato', emoji: '🐟', tint: '#FFEFEA', calories: 640, protein: 42, carbs: 50, fat: 28, fiber: 7 },
    { id: 'steak-rice', name: 'Steak, Rice & Greens', emoji: '🥩', tint: '#FDECEC', calories: 760, protein: 52, carbs: 66, fat: 30, fiber: 5 },
    { id: 'chicken-curry', name: 'Chicken Curry & Naan', emoji: '🍛', tint: '#FFF4E5', calories: 820, protein: 46, carbs: 84, fat: 32, fiber: 6 },
    { id: 'beef-spaghetti', name: 'Spaghetti Bolognese', emoji: '🍝', tint: '#FFEFEA', calories: 700, protein: 38, carbs: 86, fat: 22, fiber: 8 },
    { id: 'tofu-stirfry', name: 'Tofu Stir-Fry & Noodles', emoji: '🥢', tint: '#EDF9EE', calories: 580, protein: 28, carbs: 72, fat: 20, fiber: 9 },
  ],
  snacks: [
    { id: 'trail-mix', name: 'Trail Mix', emoji: '🥜', tint: '#F3EEE6', calories: 320, protein: 9, carbs: 28, fat: 21, fiber: 4 },
    { id: 'protein-bar', name: 'Protein Bar', emoji: '🍫', tint: '#F3EEE6', calories: 240, protein: 20, carbs: 24, fat: 8, fiber: 5 },
    { id: 'pb-toast', name: 'Peanut Butter Toast', emoji: '🍞', tint: '#FFF4E5', calories: 300, protein: 11, carbs: 30, fat: 16, fiber: 4 },
    { id: 'cottage-cheese', name: 'Cottage Cheese & Pineapple', emoji: '🍍', tint: '#FFF9DB', calories: 220, protein: 24, carbs: 20, fat: 5, fiber: 1 },
    { id: 'boiled-eggs', name: 'Boiled Eggs (3)', emoji: '🥚', tint: '#F5F8FE', calories: 210, protein: 18, carbs: 2, fat: 15, fiber: 0 },
  ],
  shakes: [
    { id: 'mass-gainer', name: 'Mass Gainer Shake', emoji: '🥤', tint: '#EEF0FF', calories: 750, protein: 40, carbs: 110, fat: 15, fiber: 4 },
    { id: 'chocolate-whey', name: 'Chocolate Whey & Milk', emoji: '🥛', tint: '#F5F8FE', calories: 330, protein: 34, carbs: 26, fat: 9, fiber: 1 },
    { id: 'berry-oat-shake', name: 'Berry Oat Shake', emoji: '🍓', tint: '#FDECEC', calories: 420, protein: 26, carbs: 60, fat: 8, fiber: 7 },
    { id: 'pb-banana-shake', name: 'PB Banana Protein Shake', emoji: '🍌', tint: '#FFF9DB', calories: 520, protein: 36, carbs: 50, fat: 19, fiber: 5 },
    { id: 'mango-lassi', name: 'Mango Protein Lassi', emoji: '🥭', tint: '#FFF1E0', calories: 380, protein: 24, carbs: 56, fat: 7, fiber: 2 },
  ],
};

export function draftFromCommon(food: CommonFood): FoodDraft {
  return {
    name: food.name,
    source: 'common',
    servingLabel: '1 serving',
    servingGrams: null,
    nutrients: { calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat, fiber: food.fiber },
  };
}
