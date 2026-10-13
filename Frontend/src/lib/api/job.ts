/**
 * Job Shield API Client
 * Connects to POST /api/job/analyze with JSON text & PDF multipart modes.
 * Client checks PDF type and <= 5 MB size limit.
 */

import { request, ApiError, DEMO_FALLBACK_ENABLED } from './client';
import type { JobShieldBackendResult } from './types';
import { getDemoJobResult } from '../demoFallback';

export interface AnalyzeJobParams {
  text?: string;
  file?: File | null;
}

export async function analyzeJob(
  params: AnalyzeJobParams,
  signal?: AbortSignal
): Promise<JobShieldBackendResult> {
  const hasFile = Boolean(params.file);
  const rawText = (params.text || '').trim();

  // Client-side guard on PDF file
  if (hasFile && params.file) {
    const file = params.file;
    const nameLower = file.name.toLowerCase();
    if (!nameLower.endsWith('.pdf')) {
      throw new ApiError({
        message: 'Unsupported file format. Only PDF files are supported.',
        status: 415,
        code: 'UNSUPPORTED_MEDIA',
      });
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new ApiError({
        message: 'The uploaded file exceeds the 5 MB limit. Please attach a smaller file.',
        status: 413,
        code: 'FILE_TOO_LARGE',
      });
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      return await request<JobShieldBackendResult>('/api/job/analyze', {
        method: 'POST',
        body: formData,
        signal,
        timeoutMs: 20000,
      });
    } catch (err) {
      if (DEMO_FALLBACK_ENABLED && err instanceof ApiError && err.isNetworkError) {
        return getDemoJobResult(params);
      }
      throw err;
    }
  }

  // Text mode
  try {
    return await request<JobShieldBackendResult>('/api/job/analyze', {
      method: 'POST',
      body: JSON.stringify({ text: rawText }),
      signal,
      timeoutMs: 15000,
    });
  } catch (err) {
    // 4xx validation errors are NEVER replaced with demo data
    if (DEMO_FALLBACK_ENABLED && err instanceof ApiError && err.isNetworkError) {
      return getDemoJobResult(params);
    }
    throw err;
  }
}
