/** Shared nutrition/scan domain types — keep UI decoupled from providers. */

export type ConfidenceBand = 'high' | 'medium' | 'low';

export type PortionMethod =
  | 'vision_estimate'
  | 'user_selected'
  | 'user_entered'
  | 'known_serving'
  | 'barcode_serving';

export interface NutritionPer100g {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface PortionEstimate {
  value: number;
  unit: 'g';
  confidence: number;
  method: PortionMethod;
  description?: string;
  difficultToEstimate?: boolean;
}

export interface ScannedFood {
  name: string;
  /** Spanish/LATAM display name shown to the user */
  displayName?: string;
  /** Query used for nutrition matching (often English/normalized) */
  normalizedQuery?: string;
  estimatedGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** 0–1 composite confidence */
  confidence: number;
  visionConfidence?: number;
  portionConfidence?: number;
  nutritionMatchConfidence?: number;
  confidenceBand?: ConfidenceBand;
  /** Discrete piece count when countable (buñuelos, medialunas, etc.) */
  count?: number;
  gramsPerUnit?: number;
  countConfidence?: number;
  isCountable?: boolean;
  portionDescription?: string;
  portion?: PortionEstimate;
  nutritionPer100g?: NutritionPer100g;
  nutritionProvider?: string;
  nutritionFoodId?: string;
  preparation?: string;
  visible?: boolean;
  aiEstimatedGrams?: number;
}

export interface ScanClarificationOption {
  id: string;
  label: string;
  /** Relative calorie impact hint for ranking, not shown as exact */
  calorieDeltaHint?: number;
}

export interface ScanClarification {
  id: string;
  question: string;
  options: ScanClarificationOption[];
  reason: string;
  /** Which detected food this affects, if any */
  relatedFoodIndex?: number;
}

export interface HiddenIngredientHint {
  name: string;
  reason: string;
  confidence: number;
}

export interface ScanTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ScanResult {
  foods: ScannedFood[];
  totals: ScanTotals;
  provider: string;
  analyzedAt: string;
  dishName?: string;
  overallConfidence?: number;
  overallConfidenceBand?: ConfidenceBand;
  clarifications?: ScanClarification[];
  possibleHiddenIngredients?: HiddenIngredientHint[];
  needsUserConfirmation?: string[];
  multiplePlatesSuspected?: boolean;
  scanSessionId?: string;
  visionProvider?: string;
  nutritionProvider?: string;
  latencyMs?: number;
}

export interface EditableFoodItem {
  localId: string;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number | null;
  confidenceBand?: ConfidenceBand | null;
  source: 'ai' | 'manual' | 'edited' | 'barcode';
  perGram: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  /** Original AI grams before user edits */
  aiEstimatedGrams?: number | null;
  count?: number | null;
  gramsPerUnit?: number | null;
  portionMethod?: PortionMethod;
  nutritionProvider?: string | null;
  nutritionFoodId?: string | null;
  barcode?: string | null;
}

export interface NutritionScanProvider {
  readonly name: string;
  scanFood(imageUri: string): Promise<ScanResult>;
}

export interface FoodNutritionProvider {
  readonly name: string;
  searchFood(query: string): Promise<FoodNutritionHit[]>;
  getNutrition(foodId: string): Promise<FoodNutritionDetail | null>;
}

export interface FoodNutritionHit {
  id: string;
  displayName: string;
  brand?: string;
  per100g: NutritionPer100g;
  servingGrams?: number;
  source: string;
}

export interface FoodNutritionDetail extends FoodNutritionHit {
  servings?: { label: string; grams: number }[];
}

export interface BarcodeNutritionProvider {
  readonly name: string;
  lookupBarcode(code: string): Promise<BarcodeProduct | null>;
}

export interface BarcodeProduct {
  barcode: string;
  displayName: string;
  brand?: string;
  per100g: NutritionPer100g;
  servingGrams: number;
  servingLabel?: string;
  source: string;
}
