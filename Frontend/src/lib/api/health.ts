/**
 * MediTrust Health Check & Backend Status Monitor
 * Polls GET /api/health on app mount and every 30s while the tab is visible.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { request, ApiError } from './client';
import type { HealthResponse } from './types';

export type BackendStatus = 'online' | 'degraded' | 'offline';

export async function checkHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return request<HealthResponse>('/api/health', {
    timeoutMs: 5000,
    signal,
  });
}

export interface BackendStatusState {
  status: BackendStatus;
  health: HealthResponse | null;
  db: 'connected' | 'disconnected' | 'unknown';
  services: HealthResponse['services'] | null;
  llm: HealthResponse['llm'] | null;
  intel: HealthResponse['intel'] | null;
  lastChecked: number | null;
  refresh: () => Promise<void>;
}

export function useBackendStatus(): BackendStatusState {
  const [status, setStatus] = useState<BackendStatus>('offline');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchStatus = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await checkHealth(controller.signal);
      setHealth(res);
      setLastChecked(Date.now());

      // If database is disconnected or no LLM provider has an API key configured, flag degraded
      const isDbDisconnected = res.db === 'disconnected';
      const noLlmConfigured = !res.services?.groq && !res.services?.nvidia;
      const isDegraded = res.status === 'degraded' || isDbDisconnected || noLlmConfigured;

      setStatus(isDegraded ? 'degraded' : 'online');
    } catch (err) {
      if (err instanceof ApiError && err.isNetworkError) {
        setStatus('offline');
      } else if (err instanceof DOMException && err.name === 'AbortError') {
        // Ignored
      } else {
        setStatus('offline');
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) {
        await fetchStatus();
      }
    })();

    let timer: number | null = null;

    const startTimer = () => {
      if (!timer) {
        timer = window.setInterval(() => {
          if (!document.hidden) {
            fetchStatus();
          }
        }, 30000);
      }
    };

    const stopTimer = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopTimer();
      } else {
        fetchStatus();
        startTimer();
      }
    };

    startTimer();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      stopTimer();
      document.removeEventListener('visibilitychange', handleVisibility);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchStatus]);

  return {
    status,
    health,
    db: health?.db ?? 'unknown',
    services: health?.services ?? null,
    llm: health?.llm ?? null,
    intel: health?.intel ?? null,
    lastChecked,
    refresh: fetchStatus,
  };
}
