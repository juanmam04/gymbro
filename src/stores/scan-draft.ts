import { create } from 'zustand';
import type { EditableFoodItem, ScanClarification, ScanResult } from '@/types/nutrition';
import { applyClarificationToFoods } from '@/features/nutrition/services/nutritionMath';
import { scanResultToEditable, sumTotals } from '@/utils/nutrition';

interface ScanDraftState {
  imageUri: string | null;
  scanResult: ScanResult | null;
  items: EditableFoodItem[];
  clarifications: ScanClarification[];
  clarificationAnswers: Record<string, string>;
  analyzingPhase: string | null;
  isAnalyzing: boolean;
  isPublishing: boolean;
  setImageUri: (uri: string | null) => void;
  setAnalyzing: (value: boolean, phase?: string | null) => void;
  setPublishing: (value: boolean) => void;
  applyScanResult: (result: ScanResult) => void;
  setItems: (items: EditableFoodItem[]) => void;
  answerClarification: (id: string, optionId: string) => void;
  reset: () => void;
}

export const useScanDraftStore = create<ScanDraftState>((set, get) => ({
  imageUri: null,
  scanResult: null,
  items: [],
  clarifications: [],
  clarificationAnswers: {},
  analyzingPhase: null,
  isAnalyzing: false,
  isPublishing: false,
  setImageUri: (uri) => set({ imageUri: uri }),
  setAnalyzing: (value, phase = null) =>
    set({ isAnalyzing: value, analyzingPhase: value ? phase : null }),
  setPublishing: (value) => set({ isPublishing: value }),
  applyScanResult: (result) =>
    set({
      scanResult: result,
      items: scanResultToEditable(result),
      clarifications: result.clarifications ?? [],
      clarificationAnswers: {},
      isAnalyzing: false,
      analyzingPhase: null,
    }),
  setItems: (items) => set({ items }),
  answerClarification: (id, optionId) => {
    const answers = { ...get().clarificationAnswers, [id]: optionId };
    const result = get().scanResult;
    if (!result) {
      set({ clarificationAnswers: answers });
      return;
    }
    const foods = applyClarificationToFoods(result.foods, answers);
    const nextResult = { ...result, foods, totals: sumTotals(foods) };
    set({
      clarificationAnswers: answers,
      scanResult: nextResult,
      items: scanResultToEditable(nextResult),
    });
  },
  reset: () =>
    set({
      imageUri: null,
      scanResult: null,
      items: [],
      clarifications: [],
      clarificationAnswers: {},
      analyzingPhase: null,
      isAnalyzing: false,
      isPublishing: false,
    }),
}));
