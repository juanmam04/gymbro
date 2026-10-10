import { getInfoAsync, readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { NutritionScanProvider, ScanResult, ScannedFood } from '@/types/nutrition';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { sumTotals } from '@/utils/nutrition';
import {
  calculateNutritionForGrams,
  enrichScannedFoodConfidence,
  selectClarifications,
} from '@/features/nutrition/services/nutritionMath';
import { matchFoodNutrition } from '@/features/nutrition/providers/FoodNutritionProviders';

/**
 * Calls Supabase Edge Function `analyze-food` (server-side vision).
 * Nutrition values are matched client-side against curated/OFF data — not LLM kcal.
 */
export class RealNutritionScanProvider implements NutritionScanProvider {
  readonly name = 'real';

  async scanFood(imageUri: string): Promise<ScanResult> {
    const base64 = await prepareImageBase64(imageUri);
    return this.analyze({ imageBase64: base64, mimeType: 'image/jpeg' });
  }

  async scanText(mealText: string): Promise<ScanResult> {
    if (mealText.trim().length < 3 || mealText.length > 1000)
      throw new Error('Describí tu comida en hasta 1000 caracteres.');
    return this.analyze({ mealText: mealText.trim() });
  }

  private async analyze(body: Record<string, string>): Promise<ScanResult> {
    const started = Date.now();
    const { data, error } = await supabase.functions.invoke('analyze-food', { body });

    if (error) {
      let detail = error.message;
      let code = '';
      if (error instanceof FunctionsHttpError) {
        try {
          const body = await error.context.json();
          if (body && typeof body === 'object') {
            if ('error' in body) detail = String((body as { error: unknown }).error);
            if ('code' in body) code = String((body as { code: unknown }).code);
          }
        } catch {
          // keep original message
        }
      }
      if (data && typeof data === 'object' && 'error' in data && !('foods' in data)) {
        detail = String((data as { error: unknown }).error);
        if ('code' in (data as object)) code = String((data as { code: unknown }).code);
      }
      logger.warn('analyze-food failed', { detail, code });
      if (code === 'QUOTA_EXCEEDED')
        throw new Error(
          'Usaste tus análisis disponibles. Podés ver tu plan o seguir registrando manualmente.',
        );
      if (code === 'INVALID_API_KEY' || detail.toLowerCase().includes('api key')) {
        throw new Error(
          'El análisis no está disponible en este momento. Podés registrar manualmente.',
        );
      }
      if (code === 'VISION_NOT_CONFIGURED') {
        throw new Error('El análisis todavía no está disponible. Podés registrar manualmente.');
      }
      if (code === 'RATE_LIMITED') {
        throw new Error(
          'El servicio está recibiendo muchas solicitudes. Esperá un minuto e intentá de nuevo.',
        );
      }
      throw new Error(mapScanError(`${code} ${detail}`.trim()));
    }

    if (data && typeof data === 'object' && 'error' in data && !('foods' in data)) {
      const code = 'code' in data ? String((data as { code: unknown }).code) : '';
      const detail = String((data as { error: unknown }).error);
      if (code === 'INVALID_API_KEY') {
        throw new Error(
          'El análisis no está disponible en este momento. Podés registrar manualmente.',
        );
      }
      throw new Error(mapScanError(`${code} ${detail}`.trim()));
    }

    const vision = data as VisionFunctionResponse;
    if (!vision?.foods || !Array.isArray(vision.foods)) {
      throw new Error('No pudimos identificar bien esta comida. Probá otra foto.');
    }

    if (vision.foods.length === 0) {
      throw new Error('No detectamos comida en la foto. Acercate al plato y probá de nuevo.');
    }

    const foods: ScannedFood[] = vision.foods.map((item) => {
      const query = item.normalized_query || item.visual_name || item.display_name || '';
      const match =
        matchFoodNutrition(query) ||
        matchFoodNutrition(item.visual_name ?? '') ||
        matchFoodNutrition(item.display_name ?? '');

      const count = Math.max(1, Math.round(Number(item.count) || 1));
      const isCountable = Boolean(item.is_countable) || count > 1;
      let gramsPerUnit = Number(item.grams_per_unit);
      let grams = Number(item.estimated_grams);

      if (isCountable) {
        if (!Number.isFinite(gramsPerUnit) || gramsPerUnit <= 0) {
          gramsPerUnit =
            Number.isFinite(grams) && grams > 0 ? grams / count : match?.hit.servingGrams || 40;
        }
        grams = gramsPerUnit * count;
      } else {
        grams = Math.max(1, grams || match?.hit.servingGrams || 100);
        gramsPerUnit = grams;
      }

      const portionConfidence = clamp01(item.portion_confidence ?? item.confidence ?? 0.5);
      const visionConfidence = clamp01(item.confidence ?? 0.5);
      const countConfidence = clamp01(
        item.count_confidence ?? (isCountable ? visionConfidence : 1),
      );
      const matchConfidence = match?.confidence ?? 0.35;
      const per100 = match?.hit.per100g ?? {
        calories: 120,
        protein: 8,
        carbs: 12,
        fat: 4,
      };
      const macros = calculateNutritionForGrams(per100, grams);
      const baseName =
        item.display_name || match?.hit.displayName || item.visual_name || 'Alimento';
      const displayName = isCountable && count > 1 ? `${baseName} (×${count})` : baseName;
      const portionDescription =
        item.portion_description ||
        (isCountable && count > 1
          ? `${count} unidades · ≈${Math.round(gramsPerUnit)} g c/u`
          : undefined);

      return enrichScannedFoodConfidence({
        name: displayName,
        displayName,
        normalizedQuery: query,
        estimatedGrams: grams,
        ...macros,
        confidence: visionConfidence,
        visionConfidence,
        portionConfidence,
        countConfidence,
        nutritionMatchConfidence: matchConfidence,
        nutritionPer100g: per100,
        nutritionProvider: match?.hit.source ?? 'fallback',
        nutritionFoodId: match?.hit.id,
        preparation: item.preparation,
        visible: item.visible !== false,
        aiEstimatedGrams: grams,
        count,
        gramsPerUnit,
        isCountable,
        portionDescription,
        portion: {
          value: grams,
          unit: 'g',
          confidence: portionConfidence,
          method: 'vision_estimate',
          description: portionDescription,
          difficultToEstimate: Boolean(item.difficult_to_estimate),
        },
      });
    });

    const clarifications =
      vision.clarifications && vision.clarifications.length > 0
        ? vision.clarifications
        : selectClarifications({
            foods,
            hidden: vision.possible_hidden_ingredients,
          });

    const overall =
      typeof vision.overall_confidence === 'number'
        ? vision.overall_confidence
        : foods.reduce((a, f) => a + f.confidence, 0) / foods.length;

    return {
      foods,
      totals: sumTotals(foods),
      provider: this.name,
      analyzedAt: new Date().toISOString(),
      dishName: vision.dish_name,
      overallConfidence: overall,
      overallConfidenceBand: enrichScannedFoodConfidence({
        name: '',
        estimatedGrams: 1,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        confidence: overall,
        visionConfidence: overall,
        portionConfidence: overall,
        nutritionMatchConfidence: overall,
      }).confidenceBand,
      clarifications,
      possibleHiddenIngredients: vision.possible_hidden_ingredients,
      needsUserConfirmation: vision.needs_user_confirmation,
      multiplePlatesSuspected: Boolean(vision.multiple_plates_suspected),
      scanSessionId: vision.scan_session_id,
      visionProvider: vision.vision_provider ?? 'openai',
      nutritionProvider: 'curated-latam',
      latencyMs: Date.now() - started,
    };
  }
}

type VisionFood = {
  visual_name?: string;
  display_name?: string;
  normalized_query?: string;
  estimated_grams?: number;
  grams_per_unit?: number;
  count?: number;
  count_confidence?: number;
  is_countable?: boolean;
  portion_description?: string;
  confidence?: number;
  portion_confidence?: number;
  preparation?: string;
  visible?: boolean;
  difficult_to_estimate?: boolean;
};

type VisionFunctionResponse = {
  dish_name?: string;
  foods: VisionFood[];
  possible_hidden_ingredients?: { name: string; reason: string; confidence: number }[];
  overall_confidence?: number;
  needs_user_confirmation?: string[];
  multiple_plates_suspected?: boolean;
  clarifications?: ScanResult['clarifications'];
  scan_session_id?: string;
  vision_provider?: string;
};

async function prepareImageBase64(imageUri: string): Promise<string> {
  try {
    const info = await getInfoAsync(imageUri);
    if (__DEV__ && info.exists && 'size' in info) {
      logger.debug('scan image size bytes', { size: info.size });
    }
  } catch {
    // ignore
  }

  const base64 = await readAsStringAsync(imageUri, {
    encoding: EncodingType.Base64,
  });

  if (base64.length > 2_000_000) {
    throw new Error(
      'La foto es demasiado pesada. Sacá otra un poco más cerca y con menos resolución.',
    );
  }
  return base64;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function mapScanError(detail: string): string {
  const d = detail.toLowerCase();
  if (d.includes('not_found') || d.includes('not found') || d.includes('404')) {
    return 'El scanner real no está desplegado todavía. Probá de nuevo en unos minutos.';
  }
  if (d.includes('vision_not_configured') || d.includes('not configured')) {
    return 'Falta configurar OPENAI_API_KEY en Supabase Secrets.';
  }
  if (d.includes('timeout') || d.includes('timed out')) {
    return 'El análisis tardó demasiado. Probá de nuevo con otra foto.';
  }
  if (d.includes('network') || d.includes('fetch') || d.includes('failed to send')) {
    return 'Revisá tu conexión e intentá nuevamente.';
  }
  if (d.includes('unauthorized') || d.includes('jwt')) {
    return 'Tu sesión expiró. Volvé a iniciar sesión.';
  }
  if (d.includes('blur') || d.includes('unclear')) {
    return 'La imagen no se ve clara. Sacá otra foto con más luz.';
  }
  if (d.includes('too large') || d.includes('image too')) {
    return 'La foto es demasiado pesada. Sacá otra más cerca.';
  }
  return 'No pudimos identificar bien esta comida. Probá otra foto o agregala manualmente.';
}
