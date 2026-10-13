/**
 * Fusion Engine & Playbook API Client
 * Sends compact shield vectors to POST /api/fusion/evaluate and /api/fusion/report.
 */

import { request, ApiError, DEMO_FALLBACK_ENABLED } from './client';
import type {
  CompactShieldIn,
  FusionEvaluatePayload,
  FusionBackendResult,
  IncidentReportPayload,
  IncidentReportBackendResult,
} from './types';
import { getDemoFusionResult, getDemoIncidentReport } from '../demoFallback';
import type { ShieldResult } from '../../types/analysis';

export function compactShieldForFusion(
  shield: ShieldResult | null | undefined
): CompactShieldIn | undefined {
  if (!shield || typeof shield.risk !== 'number') {
    return undefined;
  }

  const signals = (shield.signals || [])
    .slice(0, 8)
    .map((s) => ({
      name: String(s.name || '').slice(0, 80),
      detail: String(s.detail || '').slice(0, 200),
      severity: (s.severity || 'low') as CompactShieldIn['signals'] extends Array<infer E>
        ? E extends { severity?: infer S }
          ? S
          : never
        : never,
    }));

  const res: CompactShieldIn = {
    risk: Math.max(0, Math.min(100, Math.round(shield.risk))),
    level: shield.level,
    threat: shield.threat?.slice(0, 80),
    confidence: typeof shield.confidence === 'number' ? shield.confidence : undefined,
    signals: signals.length > 0 ? signals : undefined,
  };

  const emergency = (shield as unknown as { emergency_claim?: { detected: boolean; escalated: boolean } | boolean }).emergency_claim;
  if (emergency && typeof emergency === 'object') {
    res.emergency_claim = {
      detected: Boolean(emergency.detected),
      escalated: Boolean(emergency.escalated),
    };
  } else if (typeof emergency === 'boolean') {
    res.emergency_claim = {
      detected: emergency,
      escalated: false,
    };
  }

  const frozen = (shield as unknown as { frozen?: boolean }).frozen;
  if (typeof frozen === 'boolean') {
    res.frozen = frozen;
  }

  return res;
}

export async function evaluateFusion(
  payload: FusionEvaluatePayload,
  signal?: AbortSignal
): Promise<FusionBackendResult> {
  const hasInput = Boolean(payload.voice || payload.job || payload.sim);
  if (!hasInput) {
    throw new ApiError({
      message: 'At least one shield result must be provided for fusion evaluation.',
      status: 400,
      code: 'NO_INPUT',
    });
  }

  try {
    return await request<FusionBackendResult>('/api/fusion/evaluate', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
      timeoutMs: 15000,
    });
  } catch (err) {
    if (DEMO_FALLBACK_ENABLED && err instanceof ApiError && err.isNetworkError) {
      return getDemoFusionResult();
    }
    throw err;
  }
}

export async function generateIncidentReport(
  payload: IncidentReportPayload,
  signal?: AbortSignal
): Promise<IncidentReportBackendResult> {
  try {
    return await request<IncidentReportBackendResult>('/api/fusion/report', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
      timeoutMs: 15000,
    });
  } catch (err) {
    if (DEMO_FALLBACK_ENABLED && err instanceof ApiError && err.isNetworkError) {
      return getDemoIncidentReport();
    }
    throw err;
  }
}

export type { FusionEvaluatePayload, IncidentReportPayload };
