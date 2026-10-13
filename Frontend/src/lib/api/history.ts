/**
 * History & Analytics API Client
 * Connects to GET /api/fusion/history/stats and /recent.
 */

import { request, ApiError, DEMO_FALLBACK_ENABLED } from './client';
import type { HistoryStatsResponse, RecentScanItem } from './types';
import { getDemoHistoryStats } from '../demoFallback';

export async function getHistoryStats(
  signal?: AbortSignal
): Promise<HistoryStatsResponse> {
  try {
    return await request<HistoryStatsResponse>('/api/fusion/history/stats', {
      signal,
      timeoutMs: 10000,
    });
  } catch (err) {
    if (DEMO_FALLBACK_ENABLED && err instanceof ApiError && err.isNetworkError) {
      return getDemoHistoryStats();
    }
    throw err;
  }
}

export async function getRecentScans(
  limit = 20,
  signal?: AbortSignal
): Promise<RecentScanItem[]> {
  try {
    return await request<RecentScanItem[]>('/api/fusion/history/recent', {
      params: { limit },
      signal,
      timeoutMs: 10000,
    });
  } catch (err) {
    if (DEMO_FALLBACK_ENABLED && err instanceof ApiError && err.isNetworkError) {
      return [
        {
          id: 'demo-scan-1',
          shield: 'fusion',
          risk: 88,
          level: 'critical',
          threat: 'Coordinated Multi-Stage Fraud',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'demo-scan-2',
          shield: 'job',
          risk: 92,
          level: 'critical',
          threat: 'Healthcare Job Fraud',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'demo-scan-3',
          shield: 'voice',
          risk: 87,
          level: 'critical',
          threat: 'Deepfake Voice',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ];
    }
    throw err;
  }
}
