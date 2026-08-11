import {
  MockFoodSearchProvider,
  type FoodSearchProvider,
  type FoodSearchResult,
} from '@/features/food/food-search-types';
import { searchCuratedFoods } from '@/features/nutrition/data/curatedFoods';

export type { FoodSearchProvider, FoodSearchResult };
export { MockFoodSearchProvider } from '@/features/food/food-search-types';

/** Curated LATAM list as default real search (no private API key). */
export class CuratedFoodSearchProvider implements FoodSearchProvider {
  readonly name = 'curated-latam';

  async search(query: string): Promise<FoodSearchResult[]> {
    return searchCuratedFoods(query).map((f) => ({
      id: f.id,
      name: f.displayName,
      servingGrams: f.defaultGrams,
      calories: Math.round((f.per100g.calories * f.defaultGrams) / 100),
      protein: Math.round((f.per100g.protein * f.defaultGrams) / 100 * 10) / 10,
      carbs: Math.round((f.per100g.carbs * f.defaultGrams) / 100 * 10) / 10,
      fat: Math.round((f.per100g.fat * f.defaultGrams) / 100 * 10) / 10,
    }));
  }
}

const useMock =
  (process.env.EXPO_PUBLIC_FOOD_SEARCH_PROVIDER ?? '').toLowerCase() === 'mock' ||
  ((process.env.EXPO_PUBLIC_FOOD_SEARCH_PROVIDER ?? '') === '' && __DEV__);

let activeFoodSearchProvider: FoodSearchProvider = useMock
  ? new MockFoodSearchProvider()
  : new CuratedFoodSearchProvider();

export function getFoodSearchProvider(): FoodSearchProvider {
  return activeFoodSearchProvider;
}

export function setFoodSearchProvider(provider: FoodSearchProvider): void {
  activeFoodSearchProvider = provider;
}

export function scaleFoodToGrams(food: FoodSearchResult, grams: number) {
  const factor = grams / food.servingGrams;
  return {
    name: food.name,
    grams,
    calories: Math.round(food.calories * factor * 10) / 10,
    protein: Math.round(food.protein * factor * 10) / 10,
    carbs: Math.round(food.carbs * factor * 10) / 10,
    fat: Math.round(food.fat * factor * 10) / 10,
  };
}
