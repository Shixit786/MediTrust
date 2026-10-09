import { create } from 'zustand';
import type { ShieldId, ShieldResult, FusionResult } from '../types/analysis';

export type ScanStatus = 'idle' | 'scanning' | 'completed' | 'error';

export interface AnalysisState {
  voiceFile: File | null;
  jobMessage: string;
  jobPdf: File | null;
  simEvents: string[];
  shieldResults: Partial<Record<ShieldId, ShieldResult>>;
  fusionResult: FusionResult | null;
  status: ScanStatus;
  
  // Actions
  setVoiceFile: (file: File | null) => void;
  setJobMessage: (message: string) => void;
  setJobPdf: (file: File | null) => void;
  setSimEvents: (events: string[]) => void;
  setShieldResult: (shieldId: ShieldId, result: ShieldResult) => void;
  setFusionResult: (result: FusionResult | null) => void;
  setStatus: (status: ScanStatus) => void;
  reset: () => void;
}

const initialState = {
  voiceFile: null,
  jobMessage: '',
  jobPdf: null,
  simEvents: [],
  shieldResults: {},
  fusionResult: null,
  status: 'idle' as ScanStatus,
};

export const useAnalysisStore = create<AnalysisState>((set) => ({
  ...initialState,
  setVoiceFile: (voiceFile) => set({ voiceFile }),
  setJobMessage: (jobMessage) => set({ jobMessage }),
  setJobPdf: (jobPdf) => set({ jobPdf }),
  setSimEvents: (simEvents) => set({ simEvents }),
  setShieldResult: (shieldId, result) =>
    set((state) => ({
      shieldResults: {
        ...state.shieldResults,
        [shieldId]: result,
      },
    })),
  setFusionResult: (fusionResult) => set({ fusionResult }),
  setStatus: (status) => set({ status }),
  reset: () => set(initialState),
}));
