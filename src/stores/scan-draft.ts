import { create } from 'zustand';
import type { EditableFoodItem, ScanResult } from '@/types/nutrition';
import { scanResultToEditable } from '@/utils/nutrition';

interface ScanDraftState {
  imageUri: string | null;
  scanResult: ScanResult | null;
  items: EditableFoodItem[];
  isAnalyzing: boolean;
  isPublishing: boolean;
  setImageUri: (uri: string | null) => void;
  setAnalyzing: (value: boolean) => void;
  setPublishing: (value: boolean) => void;
  applyScanResult: (result: ScanResult) => void;
  setItems: (items: EditableFoodItem[]) => void;
  reset: () => void;
}

export const useScanDraftStore = create<ScanDraftState>((set) => ({
  imageUri: null,
  scanResult: null,
  items: [],
  isAnalyzing: false,
  isPublishing: false,
  setImageUri: (uri) => set({ imageUri: uri }),
  setAnalyzing: (value) => set({ isAnalyzing: value }),
  setPublishing: (value) => set({ isPublishing: value }),
  applyScanResult: (result) =>
    set({
      scanResult: result,
      items: scanResultToEditable(result),
      isAnalyzing: false,
    }),
  setItems: (items) => set({ items }),
  reset: () =>
    set({
      imageUri: null,
      scanResult: null,
      items: [],
      isAnalyzing: false,
      isPublishing: false,
    }),
}));
