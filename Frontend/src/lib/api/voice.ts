/**
 * Voice Shield API Client
 * Connects to POST /api/voice/analyze with fallback support for demos and offline mode.
 */

import { request, ApiError, DEMO_FALLBACK_ENABLED } from './client';
import type { VoiceShieldBackendResult } from './types';
import { getDemoVoiceResult } from '../demoFallback';

export interface AnalyzeVoiceParams {
  file?: File | Blob | null;
  sampleId?: string | null;
  fileName?: string | null;
}

export async function analyzeVoice(
  params: AnalyzeVoiceParams,
  signal?: AbortSignal
): Promise<VoiceShieldBackendResult> {
  let fileToUpload: File | Blob | null = params.file || null;

  // If no file was provided in params but a sampleId was picked, fetch the real sample audio!
  if (!fileToUpload && params.sampleId) {
    const samplePath =
      params.sampleId === 'real_human'
        ? '/samples/real_human.m4a'
        : '/samples/ai_deepfake.mp3';
    try {
      const res = await fetch(samplePath);
      if (res.ok) {
        const blob = await res.blob();
        const fallbackName = params.sampleId === 'real_human' ? 'Verified_Human_Voice.m4a' : 'Fake_Doctor_Call_AI.mp3';
        fileToUpload = new File([blob], params.fileName || fallbackName, {
          type: blob.type || (params.sampleId === 'real_human' ? 'audio/mp4' : 'audio/mpeg'),
        });
      }
    } catch {
      // If fetching public sample fails, fall through to demo fallback
    }
  }

  if (!fileToUpload) {
    if (DEMO_FALLBACK_ENABLED) {
      return getDemoVoiceResult(params);
    }
    throw new ApiError({
      message: 'Please select or record an audio file to analyze.',
      status: 400,
      code: 'NO_FILE',
    });
  }

  const formData = new FormData();
  const fileObj =
    fileToUpload instanceof File
      ? fileToUpload
      : new File([fileToUpload], params.fileName || 'recorded_audio.wav', {
          type: fileToUpload.type || 'audio/wav',
        });

  formData.append('audio', fileObj);

  try {
    const result = await request<VoiceShieldBackendResult>('/api/voice/analyze', {
      method: 'POST',
      body: formData,
      signal,
      timeoutMs: 45000, // 45s hard timeout for audio analysis
    });

    return result;
  } catch (err) {
    // Only fallback if demo fallback is active and it's a network error or upstream down
    if (
      DEMO_FALLBACK_ENABLED &&
      err instanceof ApiError &&
      (err.isNetworkError || err.status >= 500)
    ) {
      return getDemoVoiceResult(params);
    }
    throw err;
  }
}
