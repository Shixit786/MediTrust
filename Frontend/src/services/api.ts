import type { ShieldId, ShieldResult, FusionResult } from '../types/analysis';
import voiceMock from './mocks/voice.json';
import jobMock from './mocks/job.json';
import simMock from './mocks/sim.json';
import fusionMock from './mocks/fusion.json';

export const USE_MOCK = true;

export const api = {
  getVoiceAnalysis: async (): Promise<ShieldResult> => {
    if (USE_MOCK) {
      return voiceMock as ShieldResult;
    }
    throw new Error('Live API endpoint not configured yet');
  },

  getJobAnalysis: async (): Promise<ShieldResult> => {
    if (USE_MOCK) {
      return jobMock as ShieldResult;
    }
    throw new Error('Live API endpoint not configured yet');
  },

  getSimAnalysis: async (): Promise<ShieldResult> => {
    if (USE_MOCK) {
      return simMock as ShieldResult;
    }
    throw new Error('Live API endpoint not configured yet');
  },

  getShieldAnalysis: async (shieldId: ShieldId): Promise<ShieldResult> => {
    switch (shieldId) {
      case 'voice':
        return api.getVoiceAnalysis();
      case 'job':
        return api.getJobAnalysis();
      case 'sim':
        return api.getSimAnalysis();
    }
  },

  getFusionAnalysis: async (): Promise<FusionResult> => {
    if (USE_MOCK) {
      return fusionMock as FusionResult;
    }
    throw new Error('Live API endpoint not configured yet');
  },
};
