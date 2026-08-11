import type {
  BarcodeNutritionProvider,
  BarcodeProduct,
  FoodNutritionDetail,
  FoodNutritionHit,
  FoodNutritionProvider,
} from '@/types/nutrition';
import { CURATED_FOODS, matchCuratedFood, searchCuratedFoods } from '@/features/nutrition/data/curatedFoods';

const OFF_USER_AGENT = 'GymBro/1.0 (https://github.com/juanmamartinez/gymbro; nutrition)';

export class CuratedFoodNutritionProvider implements FoodNutritionProvider {
  readonly name = 'curated-latam';

  async searchFood(query: string): Promise<FoodNutritionHit[]> {
    return searchCuratedFoods(query).map((f) => ({
      id: f.id,
      displayName: f.displayName,
      per100g: f.per100g,
      servingGrams: f.defaultGrams,
      source: this.name,
    }));
  }

  async getNutrition(foodId: string): Promise<FoodNutritionDetail | null> {
    const match = matchCuratedFood(foodId);
    const found =
      CURATED_FOODS.find((f) => f.id === foodId) ??
      match?.food ??
      null;
    if (!found) return null;
    return {
      id: found.id,
      displayName: found.displayName,
      per100g: found.per100g,
      servingGrams: found.defaultGrams,
      source: this.name,
    };
  }
}

/** Open Food Facts barcode lookup — documented API v2 product endpoint. */
export class OpenFoodFactsBarcodeProvider implements BarcodeNutritionProvider {
  readonly name = 'open-food-facts';

  async lookupBarcode(code: string): Promise<BarcodeProduct | null> {
    const cleaned = code.replace(/\D/g, '');
    if (cleaned.length < 8) return null;

    const url = `https://world.openfoodfacts.org/api/v2/product/${cleaned}?fields=product_name,brands,nutriments,serving_quantity,serving_size,quantity,product_name_es`;
    const res = await fetch(url, {
      headers: { 'User-Agent': OFF_USER_AGENT, Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        product_name_es?: string;
        brands?: string;
        serving_quantity?: number | string;
        serving_size?: string;
        nutriments?: Record<string, number | undefined>;
      };
    };
    if (data.status !== 1 || !data.product) return null;

    const n = data.product.nutriments ?? {};
    const calories =
      n['energy-kcal_100g'] ??
      (typeof n['energy_100g'] === 'number' ? n['energy_100g'] / 4.184 : undefined);
    if (calories == null || !Number.isFinite(calories)) return null;

    const servingGrams = Number(data.product.serving_quantity) || 100;

    return {
      barcode: cleaned,
      displayName:
        data.product.product_name_es?.trim() ||
        data.product.product_name?.trim() ||
        'Producto',
      brand: data.product.brands?.split(',')[0]?.trim(),
      per100g: {
        calories: Number(calories) || 0,
        protein: Number(n.proteins_100g) || 0,
        carbs: Number(n.carbohydrates_100g) || 0,
        fat: Number(n.fat_100g) || 0,
      },
      servingGrams: servingGrams > 0 ? servingGrams : 100,
      servingLabel: data.product.serving_size,
      source: this.name,
    };
  }
}

const curated = new CuratedFoodNutritionProvider();
const barcodeProvider = new OpenFoodFactsBarcodeProvider();

let activeFoodNutrition: FoodNutritionProvider = curated;
let activeBarcode: BarcodeNutritionProvider = barcodeProvider;

export function getFoodNutritionProvider(): FoodNutritionProvider {
  return activeFoodNutrition;
}

export function setFoodNutritionProvider(provider: FoodNutritionProvider): void {
  activeFoodNutrition = provider;
}

export function getBarcodeNutritionProvider(): BarcodeNutritionProvider {
  return activeBarcode;
}

export function setBarcodeNutritionProvider(provider: BarcodeNutritionProvider): void {
  activeBarcode = provider;
}

export function matchFoodNutrition(query: string): {
  hit: FoodNutritionHit;
  confidence: number;
} | null {
  const match = matchCuratedFood(query);
  if (!match) return null;
  return {
    hit: {
      id: match.food.id,
      displayName: match.food.displayName,
      per100g: match.food.per100g,
      servingGrams: match.food.defaultGrams,
      source: 'curated-latam',
    },
    confidence: match.score,
  };
}
