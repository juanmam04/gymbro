export interface ScannedFood {
  name: string;
  estimatedGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
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
  source: 'ai' | 'manual' | 'edited';
  /** Per-gram macros for recalculation when grams change */
  perGram: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface NutritionScanProvider {
  readonly name: string;
  scanFood(imageUri: string): Promise<ScanResult>;
}
