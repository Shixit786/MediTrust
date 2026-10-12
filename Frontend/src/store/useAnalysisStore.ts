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
  CarrierInfo,
  SimGuardStatus,
} from '../types/analysis';
import { addHistoryEntry } from '../services/history';

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

  // SIM Guard Dedicated State
  simNumber: string | null;
  simStatus: SimGuardStatus;
  simScore: number;
  carrier: CarrierInfo | null;

  // Presenter Mode State
  presenter: {
    active: boolean;
    step: number; // 0: JOB, 1: VOICE, 2: SIM, 3: FUSION, 4: PLAYBOOK
    autoplay: boolean;
  };

  // Actions
  setVoiceFile: (file: File | null) => void;
  setJobMessage: (message: string) => void;
  setJobPdf: (file: File | null) => void;
  setSimEvents: (events: string[]) => void;
  addSimEvent: (event: string) => void;
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

  // SIM Guard Actions
  setSimNumber: (simNumber: string | null) => void;
  setSimStatus: (simStatus: SimGuardStatus) => void;
  setSimScore: (simScore: number) => void;
  setCarrier: (carrier: CarrierInfo | null) => void;

  // Presenter Actions
  startPresenter: () => void;
  nextStep: () => void;
  prevStep: () => void;
  setPresenterStep: (step: number) => void;
  toggleAutoplay: () => void;
  exitPresenter: () => void;

  reset: () => void;
  resetDemo: () => void;
  resetAll: () => void;
  resetJobShield: () => void;
  resetVoiceShield: () => void;
  resetSimGuard: () => void;
  clearAllShields: () => void;
  setShieldResultsMap: (results: Partial<Record<ShieldId, ShieldResult>>) => void;
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

  simNumber: null as string | null,
  simStatus: 'idle' as SimGuardStatus,
  simScore: 0,
  carrier: null as CarrierInfo | null,

  presenter: {
    active: false,
    step: 0,
    autoplay: false,
  },
};

export const useAnalysisStore = create<AnalysisState>((set) => ({
  ...initialState,
  setVoiceFile: (voiceFile) => set({ voiceFile }),
  setJobMessage: (jobMessage) => set({ jobMessage }),
  setJobPdf: (jobPdf) => set({ jobPdf }),
  setSimEvents: (simEvents) => set({ simEvents }),
  setShieldResult: (shieldId, result) => {
    if (result) {
      addHistoryEntry({
        shield: shieldId,
        risk: result.risk,
        level: result.level,
        threat: result.threat,
        summary: result.signals[0]?.detail || `${result.threat} evaluated.`,
      });
    }
    set((state) => ({
      shieldResults: {
        ...state.shieldResults,
        [shieldId]: result,
      },
    }));
  },
  setShieldStatus: (shieldId, status) =>
    set((state) => ({
      shieldStatus: {
        ...state.shieldStatus,
        [shieldId]: status,
      },
    })),
  setFusionResult: (fusionResult) => {
    if (fusionResult) {
      addHistoryEntry({
        shield: 'fusion',
        risk: fusionResult.overall_risk,
        level: fusionResult.level,
        threat: fusionResult.pattern,
        summary: fusionResult.explanation.slice(0, 140),
      });
    }
    set({ fusionResult });
  },
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

  addSimEvent: (event) =>
    set((state) => ({
      simEvents: [event, ...state.simEvents].slice(0, 40),
    })),
  setSimNumber: (simNumber) => set({ simNumber }),
  setSimStatus: (simStatus) => set({ simStatus }),
  setSimScore: (simScore) => set({ simScore }),
  setCarrier: (carrier) => set({ carrier }),

  startPresenter: () =>
    set({
      voiceFile: null,
      voiceInput: initialVoiceInput,
      voiceShieldState: 'idle',
      voiceResult: null,
      jobMessage: '',
      jobPdf: null,
      jobInput: initialJobInput,
      jobShieldState: 'idle',
      jobResult: null,
      simNumber: null,
      simStatus: 'idle',
      simScore: 0,
      carrier: null,
      simEvents: [],
      shieldResults: {},
      shieldStatus: initialShieldStatus,
      fusionResult: null,
      status: 'idle',
      demoStatus: 'idle',
      blobTone: 'idle',
      trustedContactAlerted: false,
      presenter: {
        active: true,
        step: 0,
        autoplay: false,
      },
    }),
  nextStep: () =>
    set((state) => ({
      presenter: {
        ...state.presenter,
        step: Math.min(4, state.presenter.step + 1),
      },
    })),
  prevStep: () =>
    set((state) => ({
      presenter: {
        ...state.presenter,
        step: Math.max(0, state.presenter.step - 1),
      },
    })),
  setPresenterStep: (step) =>
    set((state) => ({
      presenter: {
        ...state.presenter,
        step: Math.max(0, Math.min(4, step)),
      },
    })),
  toggleAutoplay: () =>
    set((state) => ({
      presenter: {
        ...state.presenter,
        autoplay: !state.presenter.autoplay,
      },
    })),
  exitPresenter: () =>
    set((state) => ({
      presenter: {
        ...state.presenter,
        active: false,
        autoplay: false,
      },
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
  resetAll: () =>
    set({
      voiceFile: null,
      voiceInput: initialVoiceInput,
      voiceShieldState: 'idle',
      voiceResult: null,
      jobMessage: '',
      jobPdf: null,
      jobInput: initialJobInput,
      jobShieldState: 'idle',
      jobResult: null,
      simNumber: null,
      simStatus: 'idle',
      simScore: 0,
      carrier: null,
      simEvents: [],
      shieldResults: {},
      shieldStatus: initialShieldStatus,
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
  resetSimGuard: () =>
    set({
      simNumber: null,
      simStatus: 'idle',
      simScore: 0,
      carrier: null,
      simEvents: [],
      blobTone: 'idle',
    }),
  clearAllShields: () =>
    set({
      shieldResults: {},
      shieldStatus: { voice: 'idle', job: 'idle', sim: 'idle' },
      fusionResult: null,
      blobTone: 'idle',
      trustedContactAlerted: false,
    }),
  setShieldResultsMap: (results) => {
    (['job', 'voice', 'sim'] as const).forEach((id) => {
      const res = results[id];
      if (res) {
        addHistoryEntry({
          shield: id,
          risk: res.risk,
          level: res.level,
          threat: res.threat,
          summary: res.signals[0]?.detail || `${res.threat} evaluated.`,
        });
      }
    });
    set({
      shieldResults: results,
      shieldStatus: {
        voice: results.voice ? 'done' : 'idle',
        job: results.job ? 'done' : 'idle',
        sim: results.sim ? 'done' : 'idle',
      },
      fusionResult: null,
      blobTone: 'idle',
    });
  },
}));
