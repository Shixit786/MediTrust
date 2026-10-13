/**
 * MediTrust Frontend API Client
 * Single typed request<T>() helper with AbortController, timeout, JSON/multipart support,
 * and mapping of backend error shapes to friendly English messages.
 */

import type { BackendErrorResponse, WithSource } from './types';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  requestId?: string;
  isNetworkError: boolean;

  constructor({
    message,
    status,
    code,
    details,
    requestId,
    isNetworkError = false,
  }: {
    message: string;
    status: number;
    code: string;
    details?: unknown;
    requestId?: string;
    isNetworkError?: boolean;
  }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.isNetworkError = isNetworkError;
  }
}

const DEFAULT_BASE_URL = 'http://localhost:5000';
export const API_BASE_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  DEFAULT_BASE_URL;

export const DEMO_FALLBACK_ENABLED: boolean =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_DEMO_FALLBACK !== 'false'
    : true;

function mapBackendErrorCodeToMessage(code: string | undefined, defaultMsg: string, status?: number): string {
  if (status === 415 || code === 'UNSUPPORTED_AUDIO' || code === 'UNSUPPORTED_MEDIA') {
    return 'M4A and WebM need ffmpeg on the server. Upload a WAV or MP3, or install ffmpeg: winget install Gyan.FFmpeg';
  }
  if (status === 503 || code === 'AUDIO_SERVICE_UNAVAILABLE') {
    return 'Voice analysis service is not running. Start it with: npm run dev:audio';
  }
  switch (code) {
    case 'RATE_LIMITED':
      return 'Too many requests, please wait a moment.';
    case 'TEXT_TOO_SHORT':
      return 'The submitted message is too short for meaningful fraud analysis. Please provide more text.';
    case 'PDF_NO_TEXT':
      return 'No extractable text found in this PDF document. Scanned images require OCR.';
    case 'FILE_TOO_LARGE':
      return 'The uploaded file exceeds the 5 MB limit. Please attach a smaller file.';
    case 'NOT_FOUND':
      return 'The requested resource or monitored record was not found.';
    case 'NO_INPUT':
      return defaultMsg || 'At least one input vector must be provided.';
    case 'VALIDATION_ERROR':
      return defaultMsg || 'The submitted data failed security validation.';
    case 'BACKEND_UNREACHABLE':
      return 'Cannot reach the MediTrust server. Check that the backend is running and CLIENT_ORIGIN includes this origin.';
    default:
      return defaultMsg || 'An unexpected error occurred while analyzing security telemetry.';
  }
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  params?: Record<string, string | number | boolean | undefined>;
}

const activeControllers = new Set<AbortController>();

export function abortAllRequests(): void {
  for (const c of activeControllers) {
    try {
      c.abort();
    } catch {
      // ignore
    }
  }
  activeControllers.clear();
}

export async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeoutMs = 15000, params, signal: customSignal, headers: customHeaders, ...fetchOpts } = options;

  let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const controller = new AbortController();
  activeControllers.add(controller);

  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, timeoutMs);

  if (customSignal) {
    customSignal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      controller.abort();
    });
  }

  const isFormData = fetchOpts.body instanceof FormData;
  const headers = new Headers(customHeaders);
  if (!isFormData && !headers.has('Content-Type') && fetchOpts.body) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...fetchOpts,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    let data: unknown = null;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errPayload = (typeof data === 'object' && data !== null ? data : {}) as BackendErrorResponse;
      const code = errPayload.code || `HTTP_${response.status}`;
      const defaultMsg = errPayload.error || response.statusText;
      const friendlyMessage = mapBackendErrorCodeToMessage(code, defaultMsg, response.status);

      throw new ApiError({
        message: friendlyMessage,
        status: response.status,
        code,
        details: errPayload.details,
        requestId: errPayload.requestId,
        isNetworkError: false,
      });
    }

    // Backend wraps successful responses in ok(res, data) -> { data: ... }
    if (data && typeof data === 'object' && 'data' in data) {
      const payload = (data as { data: T }).data;
      if (payload && typeof payload === 'object') {
        (payload as WithSource)._source = 'live';
      }
      return payload;
    }

    if (data && typeof data === 'object') {
      (data as WithSource)._source = 'live';
    }
    return data as T;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) {
      throw err;
    }

    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    if (isAbort && customSignal?.aborted) {
      throw err;
    }

    const isTimeout = err instanceof DOMException && err.name === 'TimeoutError';
    const message = isTimeout
      ? 'MediTrust request timed out. Please try again.'
      : 'Cannot reach the MediTrust server. Check that the backend is running on http://localhost:5000 and CLIENT_ORIGIN includes this origin.';

    throw new ApiError({
      message,
      status: 0,
      code: isTimeout ? 'TIMEOUT' : 'BACKEND_UNREACHABLE',
      isNetworkError: true,
    });
  } finally {
    activeControllers.delete(controller);
  }
}
