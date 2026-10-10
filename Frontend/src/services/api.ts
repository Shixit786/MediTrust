import type { ShieldId, ShieldResult, FusionResult, JobShieldResult, VoiceShieldResult } from '../types/analysis';
import voiceMock from './mocks/voice.json';
import voiceAIMock from './mocks/voiceAI.json';
import voiceAI2Mock from './mocks/voiceAI2.json';
import voiceHumanMock from './mocks/voiceHuman.json';
import jobMock from './mocks/job.json';
import jobScamMock from './mocks/jobScam.json';
import jobSafeMock from './mocks/jobSafe.json';
import simMock from './mocks/sim.json';
import fusionMock from './mocks/fusion.json';

export const USE_MOCK = true;

export interface AnalyzeJobParams {
  text?: string;
  file?: File | null;
}

export interface AnalyzeVoiceParams {
  file?: File | Blob | null;
  sampleId?: string | null;
  fileName?: string | null;
}

export const api = {
  getVoiceAnalysis: async (): Promise<ShieldResult> => {
    if (USE_MOCK) {
      return voiceMock as ShieldResult;
    }
    throw new Error('Live API endpoint not configured yet');
  },

  analyzeVoice: async (params: AnalyzeVoiceParams): Promise<VoiceShieldResult> => {
    if (USE_MOCK) {
      // 1. Choose based on sampleId if provided
      if (params.sampleId === 'real_human') {
        return voiceHumanMock as unknown as VoiceShieldResult;
      }
      if (params.sampleId === 'patient_support') {
        return voiceAI2Mock as unknown as VoiceShieldResult;
      }
      if (params.sampleId === 'ai_deepfake') {
        return voiceAIMock as unknown as VoiceShieldResult;
      }

      // 2. Choose based on file name or size if uploaded/recorded
      const name = (params.fileName || (params.file instanceof File ? params.file.name : '') || '').toLowerCase();
      if (name.includes('human') || name.includes('real')) {
        return voiceHumanMock as unknown as VoiceShieldResult;
      }
      if (name.includes('support') || name.includes('patient')) {
        return voiceAI2Mock as unknown as VoiceShieldResult;
      }
      if (name.includes('ai') || name.includes('fake') || name.includes('clone')) {
        return voiceAIMock as unknown as VoiceShieldResult;
      }

      // 3. Fallback deterministic rule from size
      const size = params.file?.size || 1024;
      if (size % 3 === 0) {
        return voiceHumanMock as unknown as VoiceShieldResult;
      }
      if (size % 2 === 0) {
        return voiceAI2Mock as unknown as VoiceShieldResult;
      }
      return voiceAIMock as unknown as VoiceShieldResult;
    }

    // Future live backend integration:
    const formData = new FormData();
    if (params.file) formData.append('audio', params.file);
    if (params.sampleId) formData.append('sampleId', params.sampleId);

    const response = await fetch('/api/audio/analyze', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error(`Voice analysis failed: ${response.statusText}`);
    }
    return response.json();
  },

  getJobAnalysis: async (): Promise<ShieldResult> => {
    if (USE_MOCK) {
      return jobMock as ShieldResult;
    }
    throw new Error('Live API endpoint not configured yet');
  },

  analyzeJob: async (params: AnalyzeJobParams): Promise<JobShieldResult> => {
    if (USE_MOCK) {
      const text = (params.text || '').toLowerCase();
      const hasFile = !!params.file;

      // Heuristic in mock mode: keywords indicating scam vs safe
      const scamKeywords = ['fee', 'upi', 'otp', 'deposit', 'limited seats', 'aadhaar', 'registration', 'gulf', 'ward coordinator'];
      const isScam = hasFile || scamKeywords.some((kw) => text.includes(kw));

      const baseResult = (isScam ? jobScamMock : jobSafeMock) as unknown as JobShieldResult;

      // If user typed custom text, preserve their actual text in the returned mock
      if (params.text && params.text.trim()) {
        return {
          ...baseResult,
          extracted_text: params.text,
        };
      }

      return baseResult;
    }

    // Future live backend integration:
    const formData = new FormData();
    if (params.file) formData.append('file', params.file);
    if (params.text) formData.append('text', params.text);

    const response = await fetch('/api/job/scan', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error(`Job scan failed: ${response.statusText}`);
    }
    return response.json();
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
