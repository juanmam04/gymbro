export interface FoodSearchResult {
  id: string;
  name: string;
  brand?: string;
  servingGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodSearchProvider {
  readonly name: string;
  search(query: string): Promise<FoodSearchResult[]>;
}

const MOCK_FOODS: FoodSearchResult[] = [
  { id: '1', name: 'Huevo', servingGrams: 50, calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8 },
  { id: '2', name: 'Arroz blanco cocido', servingGrams: 100, calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { id: '3', name: 'Pechuga de pollo', servingGrams: 100, calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { id: '4', name: 'Banana', servingGrams: 120, calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { id: '5', name: 'Manzana', servingGrams: 180, calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { id: '6', name: 'Avena', servingGrams: 40, calories: 150, protein: 5, carbs: 27, fat: 3 },
  { id: '7', name: 'Leche entera', servingGrams: 200, calories: 122, protein: 6.4, carbs: 9.6, fat: 6.6 },
  { id: '8', name: 'Yogur natural', servingGrams: 150, calories: 90, protein: 8, carbs: 6, fat: 3.5 },
  { id: '9', name: 'Pan integral', servingGrams: 30, calories: 75, protein: 3.5, carbs: 13, fat: 1 },
  { id: '10', name: 'Pasta cocida', servingGrams: 100, calories: 158, protein: 5.8, carbs: 31, fat: 0.9 },
  { id: '11', name: 'Carne vacuna magra', servingGrams: 100, calories: 200, protein: 26, carbs: 0, fat: 10 },
  { id: '12', name: 'Atún en agua', servingGrams: 100, calories: 116, protein: 26, carbs: 0, fat: 1 },
  { id: '13', name: 'Queso fresco', servingGrams: 30, calories: 80, protein: 6, carbs: 1, fat: 6 },
  { id: '14', name: 'Palta', servingGrams: 50, calories: 80, protein: 1, carbs: 4, fat: 7.5 },
  { id: '15', name: 'Café solo', servingGrams: 200, calories: 2, protein: 0.3, carbs: 0, fat: 0 },
  { id: '16', name: 'Batata cocida', servingGrams: 100, calories: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  { id: '17', name: 'Quinoa cocida', servingGrams: 100, calories: 120, protein: 4.4, carbs: 21, fat: 1.9 },
  { id: '18', name: 'Almendras', servingGrams: 28, calories: 160, protein: 6, carbs: 6, fat: 14 },
];

export class MockFoodSearchProvider implements FoodSearchProvider {
  readonly name = 'mock';

  async search(query: string): Promise<FoodSearchResult[]> {
    await new Promise((r) => setTimeout(r, 250));
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_FOODS.slice(0, 8);
    return MOCK_FOODS.filter((f) => f.name.toLowerCase().includes(q));
  }
}

let activeFoodSearchProvider: FoodSearchProvider = new MockFoodSearchProvider();

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
