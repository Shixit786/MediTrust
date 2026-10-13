/**
 * SIM Guard API Client
 * Manages phone registration, simulation triggers, freeze protocol, and state query.
 * Normalizes Indian phone numbers and never logs them.
 */

import { request, ApiError, DEMO_FALLBACK_ENABLED } from './client';
import type { SimBackendResult } from './types';
import { getDemoSimResult, getDemoSimCarrier } from '../demoFallback';
import type { CarrierInfo } from '../../types/analysis';

export function normalizeIndianPhone(raw: string): string {
  let cleaned = raw.replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
}

export function isValidIndianPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizeIndianPhone(phone));
}

export function mapSimulationTypeToBackend(type: string): string {
  switch (type) {
    case 'location_jump':
      return 'location_anomaly';
    case 'device_switch':
      return 'imei_change';
    case 'otp_flood':
      return 'otp_flood';
    case 'full_chain':
      return 'full_chain';
    default:
      return type;
  }
}

export async function registerSim(
  phone: string,
  guardianName?: string
): Promise<CarrierInfo> {
  const normalized = normalizeIndianPhone(phone);
  if (!isValidIndianPhone(normalized)) {
    throw new ApiError({
      message: 'Must be a valid 10-digit Indian phone number starting with 6, 7, 8, or 9.',
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  }

  try {
    const res = await request<SimBackendResult>('/api/sim/register', {
      method: 'POST',
      body: JSON.stringify({
        phone: normalized,
        guardianName: guardianName?.trim() || undefined,
      }),
    });

    const fallbackCarrier = getDemoSimCarrier();
    return {
      provider: fallbackCarrier.provider || 'Airtel / Jio Demo Network',
      line_type: fallbackCarrier.line_type || 'PREPAID · 5G ACTIVE',
      region: fallbackCarrier.region || 'Delhi NCR',
      fraud_score: res.riskScore || 12,
      confidence: `${Math.round((res.riskScore || 12) * 0.9)}%`,
      recent_sim_change: 'NONE IN 90 DAYS',
      roaming: 'NO',
      disclaimer: res.disclaimer,
      simulated: res.simulated,
    };
  } catch (err) {
    if (DEMO_FALLBACK_ENABLED && err instanceof ApiError && err.isNetworkError) {
      const demo = getDemoSimCarrier();
      return {
        ...demo,
        _source: 'demo',
      } as CarrierInfo;
    }
    throw err;
  }
}

export async function simulateSimEvent(
  type: string,
  phone: string
): Promise<{ status: string; riskScore: number; level: string }> {
  const normalized = normalizeIndianPhone(phone);
  const backendType = mapSimulationTypeToBackend(type);

  try {
    return await request<{ status: string; riskScore: number; level: string }>(
      `/api/sim/simulate/${backendType}`,
      {
        method: 'POST',
        body: JSON.stringify({ phone: normalized }),
      }
    );
  } catch (err) {
    if (DEMO_FALLBACK_ENABLED && err instanceof ApiError && err.isNetworkError) {
      return { status: 'anomaly', riskScore: 78, level: 'high' };
    }
    throw err;
  }
}

export async function freezeSim(
  phone: string
): Promise<{ status: string; frozen: boolean; message: string }> {
  const normalized = normalizeIndianPhone(phone);
  try {
    return await request<{ status: string; frozen: boolean; message: string }>(
      '/api/sim/freeze',
      {
        method: 'POST',
        body: JSON.stringify({ phone: normalized }),
      }
    );
  } catch (err) {
    if (DEMO_FALLBACK_ENABLED && err instanceof ApiError && err.isNetworkError) {
      return {
        status: 'frozen',
        frozen: true,
        message: 'SIM lock successfully placed on demo handset session.',
      };
    }
    throw err;
  }
}

export async function resetSim(
  phone?: string
): Promise<{ ok: boolean; message: string }> {
  const normalized = phone ? normalizeIndianPhone(phone) : undefined;
  try {
    return await request<{ ok: boolean; message: string }>('/api/sim/reset', {
      method: 'POST',
      body: JSON.stringify({ phone: normalized }),
    });
  } catch (err) {
    if (DEMO_FALLBACK_ENABLED && err instanceof ApiError && err.isNetworkError) {
      return { ok: true, message: 'Reset successful' };
    }
    throw err;
  }
}

export async function getSimDetails(
  phone: string
): Promise<SimBackendResult> {
  const normalized = normalizeIndianPhone(phone);
  try {
    return await request<SimBackendResult>(`/api/sim/${normalized}`);
  } catch (err) {
    if (DEMO_FALLBACK_ENABLED && err instanceof ApiError && err.isNetworkError) {
      return getDemoSimResult(normalized);
    }
    throw err;
  }
}
