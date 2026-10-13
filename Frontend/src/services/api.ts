import type {
  ShieldId,
  ShieldResult,
  JobShieldResult,
  VoiceShieldResult,
  CarrierInfo,
} from '../types/analysis';

import {
  analyzeVoice as analyzeVoiceApi,
  type AnalyzeVoiceParams,
} from '../lib/api/voice';
import {
  analyzeJob as analyzeJobApi,
  type AnalyzeJobParams,
} from '../lib/api/job';
import {
  registerSim as registerSimApi,
  simulateSimEvent as simulateSimApi,
  freezeSim as freezeSimApi,
  resetSim as resetSimApi,
  getSimDetails as getSimDetailsApi,
} from '../lib/api/sim';
import {
  evaluateFusion as evaluateFusionApi,
  generateIncidentReport as generateIncidentReportApi,
  type FusionEvaluatePayload,
  type IncidentReportPayload,
} from '../lib/api/fusion';
import {
  getHistoryStats as getHistoryStatsApi,
  getRecentScans as getRecentScansApi,
} from '../lib/api/history';
import {
  getDemoVoiceResult,
  getDemoJobResult,
  getDemoFusionResult,
  getDemoIncidentReport,
  getDemoHistoryStats,
  simMock,
  simCarrierMock,
} from '../lib/demoFallback';

let useMockState = false;

export function isUsingMock(): boolean {
  return useMockState;
}

export function setUseMock(val: boolean): void {
  useMockState = val;
}

export const USE_MOCK = useMockState;

export type { AnalyzeJobParams, AnalyzeVoiceParams };

export const api = {
  getVoiceAnalysis: async (): Promise<ShieldResult> => {
    return getDemoVoiceResult() as unknown as ShieldResult;
  },

  analyzeVoice: async (
    params: AnalyzeVoiceParams,
    signal?: AbortSignal
  ): Promise<VoiceShieldResult> => {
    if (useMockState) {
      return getDemoVoiceResult(params) as unknown as VoiceShieldResult;
    }
    return (await analyzeVoiceApi(params, signal)) as unknown as VoiceShieldResult;
  },

  getJobAnalysis: async (): Promise<ShieldResult> => {
    return getDemoJobResult() as unknown as ShieldResult;
  },

  analyzeJob: async (
    params: AnalyzeJobParams,
    signal?: AbortSignal
  ): Promise<JobShieldResult> => {
    if (useMockState) {
      return getDemoJobResult(params) as unknown as JobShieldResult;
    }
    return (await analyzeJobApi(params, signal)) as unknown as JobShieldResult;
  },

  getSimAnalysis: async (): Promise<ShieldResult> => {
    return simMock as unknown as ShieldResult;
  },

  registerNumber: async (
    phone: string,
    guardianName?: string
  ): Promise<CarrierInfo> => {
    if (useMockState) {
      return {
        ...simCarrierMock,
        _source: 'demo',
      } as unknown as CarrierInfo;
    }
    return (await registerSimApi(phone, guardianName)) as unknown as CarrierInfo;
  },

  simulateSim: async (
    type: string,
    phone: string
  ): Promise<{ status: string; riskScore: number; level: string }> => {
    if (useMockState) {
      return { status: 'anomaly', riskScore: 78, level: 'high' };
    }
    return await simulateSimApi(type, phone);
  },

  freezeSim: async (
    phone: string
  ): Promise<{ status: string; frozen: boolean; message: string }> => {
    if (useMockState) {
      return { status: 'frozen', frozen: true, message: 'SIM lock placed (demo)' };
    }
    return await freezeSimApi(phone);
  },

  resetSim: async (phone?: string): Promise<{ ok: boolean; message: string }> => {
    if (useMockState) {
      return { ok: true, message: 'Reset successful' };
    }
    return await resetSimApi(phone);
  },

  getSimDetails: async (phone: string) => {
    return await getSimDetailsApi(phone);
  },

  getShieldAnalysis: async (shield: ShieldId): Promise<ShieldResult> => {
    switch (shield) {
      case 'voice':
        return api.getVoiceAnalysis();
      case 'job':
        return api.getJobAnalysis();
      case 'sim':
        return api.getSimAnalysis();
    }
  },

  getFusionAnalysis: async (): Promise<ShieldResult> => {
    return getDemoFusionResult() as unknown as ShieldResult;
  },

  evaluateFusion: async (
    payload: FusionEvaluatePayload,
    signal?: AbortSignal
  ) => {
    if (useMockState) {
      return getDemoFusionResult();
    }
    return await evaluateFusionApi(payload, signal);
  },

  generateReport: async (
    payload: IncidentReportPayload,
    signal?: AbortSignal
  ) => {
    if (useMockState) {
      return getDemoIncidentReport();
    }
    return await generateIncidentReportApi(payload, signal);
  },

  getHistoryStats: async (signal?: AbortSignal) => {
    if (useMockState) {
      return getDemoHistoryStats();
    }
    return await getHistoryStatsApi(signal);
  },

  getRecentScans: async (limit = 20, signal?: AbortSignal) => {
    return await getRecentScansApi(limit, signal);
  },
};
