import { create } from 'zustand';
import type {
  ShieldId,
  ShieldResult,
  FusionResult,
  BlobTone,
  ShieldCardStatus,
  DemoStatus,
  JobShieldResult,
  VoiceShieldResult,
  VoiceShieldStatus,
  VoiceInputData,
} from '../types/analysis';

export type ScanStatus = 'idle' | 'scanning' | 'completed' | 'error';
export type JobShieldStatus = 'idle' | 'scanning' | 'done' | 'error';

export interface JobInputData {
  text: string;
  fileName: string | null;
}

export interface AnalysisState {
  voiceFile: File | null;
  jobMessage: string;
  jobPdf: File | null;
  simEvents: string[];
  shieldResults: Partial<Record<ShieldId, ShieldResult>>;
  shieldStatus: Record<ShieldId, ShieldCardStatus>;
  fusionResult: FusionResult | null;
  status: ScanStatus;
  demoStatus: DemoStatus;
  blobTone: BlobTone;
  trustedContactAlerted: boolean;

  // Job Shield Dedicated State
  jobInput: JobInputData;
  jobShieldState: JobShieldStatus;
  jobResult: JobShieldResult | null;

  // Voice Shield Dedicated State
  voiceInput: VoiceInputData;
  voiceShieldState: VoiceShieldStatus;
  voiceResult: VoiceShieldResult | null;

  // Actions
  setVoiceFile: (file: File | null) => void;
  setJobMessage: (message: string) => void;
  setJobPdf: (file: File | null) => void;
  setSimEvents: (events: string[]) => void;
  setShieldResult: (shieldId: ShieldId, result: ShieldResult) => void;
  setShieldStatus: (shieldId: ShieldId, status: ShieldCardStatus) => void;
  setFusionResult: (result: FusionResult | null) => void;
  setStatus: (status: ScanStatus) => void;
  setDemoStatus: (status: DemoStatus) => void;
  setBlobTone: (tone: BlobTone) => void;
  setTrustedContactAlerted: (alerted: boolean) => void;

  // Job Shield Actions
  setJobInput: (input: JobInputData) => void;
  setJobShieldState: (state: JobShieldStatus) => void;
  setJobResult: (result: JobShieldResult | null) => void;

  // Voice Shield Actions
  setVoiceInput: (input: VoiceInputData) => void;
  setVoiceShieldState: (state: VoiceShieldStatus) => void;
  setVoiceResult: (result: VoiceShieldResult | null) => void;

  reset: () => void;
  resetDemo: () => void;
  resetJobShield: () => void;
  resetVoiceShield: () => void;
}

const initialShieldStatus: Record<ShieldId, ShieldCardStatus> = {
  voice: 'idle',
  job: 'idle',
  sim: 'idle',
};

const initialJobInput: JobInputData = {
  text: '',
  fileName: null,
};

const initialVoiceInput: VoiceInputData = {
  fileName: null,
  source: null,
  sampleId: null,
  duration: null,
};

const initialState = {
  voiceFile: null,
  jobMessage: '',
  jobPdf: null,
  simEvents: [],
  shieldResults: {},
  shieldStatus: initialShieldStatus,
  fusionResult: null,
  status: 'idle' as ScanStatus,
  demoStatus: 'idle' as DemoStatus,
  blobTone: 'idle' as BlobTone,
  trustedContactAlerted: false,

  jobInput: initialJobInput,
  jobShieldState: 'idle' as JobShieldStatus,
  jobResult: null,

  voiceInput: initialVoiceInput,
  voiceShieldState: 'idle' as VoiceShieldStatus,
  voiceResult: null,
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
  setShieldStatus: (shieldId, status) =>
    set((state) => ({
      shieldStatus: {
        ...state.shieldStatus,
        [shieldId]: status,
      },
    })),
  setFusionResult: (fusionResult) => set({ fusionResult }),
  setStatus: (status) => set({ status }),
  setDemoStatus: (demoStatus) => set({ demoStatus }),
  setBlobTone: (blobTone) => set({ blobTone }),
  setTrustedContactAlerted: (trustedContactAlerted) => set({ trustedContactAlerted }),

  setJobInput: (jobInput) => set({ jobInput }),
  setJobShieldState: (jobShieldState) => set({ jobShieldState }),
  setJobResult: (jobResult) =>
    set((state) => ({
      jobResult,
      // Mirror to global shieldResults and shieldStatus for dashboard interoperability
      shieldResults: jobResult
        ? {
            ...state.shieldResults,
            job: jobResult,
          }
        : state.shieldResults,
      shieldStatus: jobResult
        ? {
            ...state.shieldStatus,
            job: 'done',
          }
        : state.shieldStatus,
    })),

  setVoiceInput: (voiceInput) => set({ voiceInput }),
  setVoiceShieldState: (voiceShieldState) => set({ voiceShieldState }),
  setVoiceResult: (voiceResult) =>
    set((state) => ({
      voiceResult,
      shieldResults: voiceResult
        ? {
            ...state.shieldResults,
            voice: voiceResult,
          }
        : state.shieldResults,
      shieldStatus: voiceResult
        ? {
            ...state.shieldStatus,
            voice: 'done',
          }
        : state.shieldStatus,
    })),

  reset: () => set(initialState),
  resetDemo: () =>
    set({
      shieldResults: {},
      shieldStatus: { voice: 'idle', job: 'idle', sim: 'idle' },
      fusionResult: null,
      status: 'idle',
      demoStatus: 'idle',
      blobTone: 'idle',
      trustedContactAlerted: false,
    }),
  resetJobShield: () =>
    set({
      jobInput: initialJobInput,
      jobShieldState: 'idle',
      jobResult: null,
      blobTone: 'idle',
    }),
  resetVoiceShield: () =>
    set({
      voiceInput: initialVoiceInput,
      voiceShieldState: 'idle',
      voiceResult: null,
      blobTone: 'idle',
    }),
}));
