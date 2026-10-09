import type { NutritionScanProvider } from '@/types/nutrition';
import { MockNutritionScanProvider } from '@/features/nutrition/providers/MockNutritionScanProvider';
import { RealNutritionScanProvider } from '@/features/nutrition/providers/RealNutritionScanProvider';

export type ScanProviderMode = 'mock' | 'real';

/**
 * EXPO_PUBLIC_NUTRITION_SCAN_PROVIDER=mock|real
 * Default: real in every build. Use mock only when explicitly requested for local development.
 * Production never silently fakes detections when mode=real fails — errors surface in UI.
 */
export function resolveScanProviderMode(): ScanProviderMode {
  const raw = (process.env.EXPO_PUBLIC_NUTRITION_SCAN_PROVIDER ?? '').trim().toLowerCase();
  if (raw === 'mock' || raw === 'real') return raw;
  return 'real';
}

let activeProvider: NutritionScanProvider | null = null;

export function getNutritionScanProvider(): NutritionScanProvider {
  if (!activeProvider) {
    activeProvider =
      resolveScanProviderMode() === 'real'
        ? new RealNutritionScanProvider()
        : new MockNutritionScanProvider();
  }
  return activeProvider;
}

export function setNutritionScanProvider(provider: NutritionScanProvider): void {
  activeProvider = provider;
}

export { MockNutritionScanProvider } from '@/features/nutrition/providers/MockNutritionScanProvider';
export { RealNutritionScanProvider } from '@/features/nutrition/providers/RealNutritionScanProvider';
