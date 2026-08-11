/**
 * Curated LATAM / Uruguay-friendly nutrition table (per 100g).
 * Used as primary match for common foods — NOT LLM-invented values.
 * Sources: typical USDA / public reference ranges rounded for consumer use.
 */
export interface CuratedFood {
  id: string;
  displayName: string;
  aliases: string[];
  normalizedQuery: string;
  per100g: { calories: number; protein: number; carbs: number; fat: number };
  defaultGrams: number;
}

export const CURATED_FOODS: CuratedFood[] = [
  { id: 'chicken_breast_cooked', displayName: 'Pechuga de pollo', aliases: ['pollo', 'pechuga', 'chicken breast', 'chicken'], normalizedQuery: 'chicken breast cooked', per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 }, defaultGrams: 150 },
  { id: 'rice_white_cooked', displayName: 'Arroz blanco', aliases: ['arroz', 'rice', 'arroz blanco'], normalizedQuery: 'white rice cooked', per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 }, defaultGrams: 180 },
  { id: 'avocado', displayName: 'Palta', aliases: ['palta', 'aguacate', 'avocado'], normalizedQuery: 'avocado', per100g: { calories: 160, protein: 2, carbs: 8.5, fat: 14.7 }, defaultGrams: 60 },
  { id: 'beef_lean', displayName: 'Carne vacuna magra', aliases: ['carne', 'vacuna', 'asado', 'churrasco', 'beef'], normalizedQuery: 'beef lean cooked', per100g: { calories: 200, protein: 26, carbs: 0, fat: 10 }, defaultGrams: 150 },
  { id: 'milanesa', displayName: 'Milanesa', aliases: ['milanesa'], normalizedQuery: 'breaded beef cutlet', per100g: { calories: 250, protein: 18, carbs: 12, fat: 14 }, defaultGrams: 150 },
  { id: 'egg', displayName: 'Huevo', aliases: ['huevo', 'egg'], normalizedQuery: 'egg whole cooked', per100g: { calories: 155, protein: 13, carbs: 1.1, fat: 11 }, defaultGrams: 50 },
  { id: 'pasta_cooked', displayName: 'Pasta cocida', aliases: ['pasta', 'fideos', 'ñoquis'], normalizedQuery: 'pasta cooked', per100g: { calories: 158, protein: 5.8, carbs: 31, fat: 0.9 }, defaultGrams: 200 },
  { id: 'bread', displayName: 'Pan', aliases: ['pan', 'bread'], normalizedQuery: 'bread white', per100g: { calories: 265, protein: 9, carbs: 49, fat: 3.2 }, defaultGrams: 50 },
  { id: 'mozzarella', displayName: 'Muzzarella', aliases: ['muzzarella', 'muzarella', 'mozzarella', 'queso'], normalizedQuery: 'mozzarella', per100g: { calories: 280, protein: 22, carbs: 2.2, fat: 17 }, defaultGrams: 40 },
  { id: 'empanada', displayName: 'Empanada', aliases: ['empanada'], normalizedQuery: 'empanada beef', per100g: { calories: 260, protein: 10, carbs: 28, fat: 12 }, defaultGrams: 100 },
  { id: 'dulce_de_leche', displayName: 'Dulce de leche', aliases: ['dulce de leche'], normalizedQuery: 'dulce de leche', per100g: { calories: 315, protein: 6.8, carbs: 55, fat: 7.4 }, defaultGrams: 20 },
  { id: 'medialuna', displayName: 'Medialuna', aliases: ['medialuna', 'croissant'], normalizedQuery: 'croissant', per100g: { calories: 406, protein: 8, carbs: 46, fat: 21 }, defaultGrams: 50 },
  { id: 'alfajor', displayName: 'Alfajor', aliases: ['alfajor'], normalizedQuery: 'alfajor', per100g: { calories: 420, protein: 6, carbs: 55, fat: 20 }, defaultGrams: 50 },
  { id: 'faina', displayName: 'Fainá', aliases: ['faina', 'fainá'], normalizedQuery: 'chickpea flatbread', per100g: { calories: 220, protein: 10, carbs: 25, fat: 9 }, defaultGrams: 80 },
  { id: 'lettuce', displayName: 'Lechuga', aliases: ['lechuga', 'lettuce', 'ensalada'], normalizedQuery: 'lettuce', per100g: { calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2 }, defaultGrams: 50 },
  { id: 'tomato', displayName: 'Tomate', aliases: ['tomate', 'tomato'], normalizedQuery: 'tomato', per100g: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 }, defaultGrams: 80 },
  { id: 'banana', displayName: 'Banana', aliases: ['banana', 'banano'], normalizedQuery: 'banana', per100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 }, defaultGrams: 120 },
  { id: 'apple', displayName: 'Manzana', aliases: ['manzana', 'apple'], normalizedQuery: 'apple', per100g: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 }, defaultGrams: 180 },
  { id: 'oats', displayName: 'Avena', aliases: ['avena', 'oats'], normalizedQuery: 'oats dry', per100g: { calories: 389, protein: 17, carbs: 66, fat: 7 }, defaultGrams: 40 },
  { id: 'milk_whole', displayName: 'Leche entera', aliases: ['leche', 'milk'], normalizedQuery: 'milk whole', per100g: { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 }, defaultGrams: 200 },
  { id: 'yogurt', displayName: 'Yogur', aliases: ['yogur', 'yogurt'], normalizedQuery: 'yogurt plain', per100g: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 }, defaultGrams: 150 },
  { id: 'potato', displayName: 'Papa cocida', aliases: ['papa', 'patata', 'potato'], normalizedQuery: 'potato boiled', per100g: { calories: 87, protein: 1.9, carbs: 20, fat: 0.1 }, defaultGrams: 150 },
  { id: 'sweet_potato', displayName: 'Batata', aliases: ['batata', 'boniato', 'sweet potato'], normalizedQuery: 'sweet potato cooked', per100g: { calories: 86, protein: 1.6, carbs: 20, fat: 0.1 }, defaultGrams: 150 },
  { id: 'tuna', displayName: 'Atún', aliases: ['atun', 'atún', 'tuna'], normalizedQuery: 'tuna canned water', per100g: { calories: 116, protein: 26, carbs: 0, fat: 1 }, defaultGrams: 100 },
  { id: 'salmon', displayName: 'Salmón', aliases: ['salmon', 'salmón'], normalizedQuery: 'salmon cooked', per100g: { calories: 208, protein: 20, carbs: 0, fat: 13 }, defaultGrams: 120 },
  { id: 'burger', displayName: 'Hamburguesa', aliases: ['hamburguesa', 'burger'], normalizedQuery: 'hamburger', per100g: { calories: 265, protein: 15, carbs: 24, fat: 13 }, defaultGrams: 180 },
  { id: 'pizza', displayName: 'Pizza', aliases: ['pizza'], normalizedQuery: 'pizza cheese', per100g: { calories: 266, protein: 11, carbs: 33, fat: 10 }, defaultGrams: 120 },
  { id: 'sushi', displayName: 'Sushi', aliases: ['sushi', 'roll'], normalizedQuery: 'sushi roll', per100g: { calories: 150, protein: 6, carbs: 25, fat: 3 }, defaultGrams: 150 },
  { id: 'chivito', displayName: 'Chivito', aliases: ['chivito'], normalizedQuery: 'chivito sandwich uruguay', per100g: { calories: 250, protein: 14, carbs: 18, fat: 13 }, defaultGrams: 280 },
  { id: 'torta_frita', displayName: 'Torta frita', aliases: ['torta frita'], normalizedQuery: 'fried dough', per100g: { calories: 380, protein: 6, carbs: 45, fat: 19 }, defaultGrams: 70 },
  { id: 'spinach_fritter', displayName: 'Buñuelo de espinaca', aliases: ['buñuelo', 'bunuelo', 'buñuelos', 'bunuelos', 'buñuelo de espinaca', 'spinach fritter', 'fritter'], normalizedQuery: 'spinach fritter', per100g: { calories: 220, protein: 7, carbs: 18, fat: 13 }, defaultGrams: 40 },
  { id: 'mate', displayName: 'Mate', aliases: ['mate', 'yerba'], normalizedQuery: 'mate tea', per100g: { calories: 0, protein: 0, carbs: 0, fat: 0 }, defaultGrams: 200 },
  { id: 'oil', displayName: 'Aceite', aliases: ['aceite', 'oil'], normalizedQuery: 'vegetable oil', per100g: { calories: 884, protein: 0, carbs: 0, fat: 100 }, defaultGrams: 10 },
];

export function matchCuratedFood(query: string): { food: CuratedFood; score: number } | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  let best: { food: CuratedFood; score: number } | null = null;
  for (const food of CURATED_FOODS) {
    let score = 0;
    if (food.displayName.toLowerCase() === q || food.normalizedQuery === q) score = 1;
    else if (food.aliases.some((a) => a === q)) score = 0.95;
    else if (food.aliases.some((a) => q.includes(a) || a.includes(q))) score = 0.8;
    else if (food.displayName.toLowerCase().includes(q) || q.includes(food.displayName.toLowerCase()))
      score = 0.7;
    if (score > 0 && (!best || score > best.score)) best = { food, score };
  }
  return best;
}

export function searchCuratedFoods(query: string, limit = 12): CuratedFood[] {
  const q = query.trim().toLowerCase();
  if (!q) return CURATED_FOODS.slice(0, limit);
  return CURATED_FOODS.filter(
    (f) =>
      f.displayName.toLowerCase().includes(q) ||
      f.aliases.some((a) => a.includes(q)) ||
      f.normalizedQuery.includes(q),
  ).slice(0, limit);
}
