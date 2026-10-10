import type {
  SimTelemetryEvent,
  SimEventType,
  SimGuardStatus,
  ShieldResult,
  Signal,
  RiskLevel,
  SimRedFlag,
} from '../types/analysis';

const WEIGHTS: Record<string, number> = {
  LOCATION_JUMP: 25,
  DEVICE_SWITCH: 25,
  OTP_FLOOD: 25,
  SIM_CHANGE: 20,
};

export interface AnomalyEvaluation {
  score: number;
  status: SimGuardStatus;
  integrity: number;
  distinctTypes: SimEventType[];
  shieldResult: ShieldResult;
  redFlags: SimRedFlag[];
}

/**
 * Evaluates current events against anomaly weights and produces status, score, integrity, and ShieldResult.
 */
export function evaluateAnomaly(
  events: SimTelemetryEvent[],
  currentStatus: SimGuardStatus = 'normal'
): AnomalyEvaluation {
  // If explicitly frozen, preserve frozen status
  if (currentStatus === 'frozen') {
    const shield = buildShieldResult(95, 'frozen', events);
    return {
      score: 95,
      status: 'frozen',
      integrity: 24,
      distinctTypes: getDistinctAttackTypes(events),
      shieldResult: shield,
      redFlags: buildRedFlags(events),
    };
  }

  // Filter distinct attack event types
  const distinctAttackTypes = getDistinctAttackTypes(events);

  // Sum weights of distinct attack event types
  let totalWeight = 0;
  for (const t of distinctAttackTypes) {
    totalWeight += WEIGHTS[t] || 0;
  }

  // Bonus +10 if 3 or more distinct types
  if (distinctAttackTypes.length >= 3) {
    totalWeight += 10;
  }

  const score = Math.min(100, Math.max(0, totalWeight));

  // Determine status
  let status: SimGuardStatus = 'normal';
  if (score >= 60 || distinctAttackTypes.length >= 3) {
    status = 'confirmed';
  } else if (score >= 25) {
    status = 'anomaly';
  } else {
    status = 'normal';
  }

  // Calculate network integrity: 100 - round(score * 0.8) with +-1 noise when idle
  let integrity = 100 - Math.round(score * 0.8);
  if (score === 0) {
    const noise = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
    integrity = Math.min(99, Math.max(97, 98 + noise));
  } else {
    integrity = Math.min(100, Math.max(12, integrity));
  }

  const shieldResult = buildShieldResult(score, status, events);
  const redFlags = buildRedFlags(events);

  return {
    score,
    status,
    integrity,
    distinctTypes: distinctAttackTypes,
    shieldResult,
    redFlags,
  };
}

function getDistinctAttackTypes(events: SimTelemetryEvent[]): SimEventType[] {
  const typesSet = new Set<SimEventType>();
  for (const ev of events) {
    if (
      ev.type === 'LOCATION_JUMP' ||
      ev.type === 'DEVICE_SWITCH' ||
      ev.type === 'OTP_FLOOD' ||
      ev.type === 'SIM_CHANGE' ||
      ev.type === 'ANOMALY_SPIKE' ||
      ev.type === 'SWAP_CONFIRMED'
    ) {
      typesSet.add(ev.type);
    }
  }
  return Array.from(typesSet);
}

function buildShieldResult(
  score: number,
  status: SimGuardStatus,
  events: SimTelemetryEvent[]
): ShieldResult {
  const isConfirmed = status === 'confirmed' || status === 'frozen';
  const effectiveRisk = isConfirmed ? 95 : score;

  let level: RiskLevel = 'low';
  if (effectiveRisk >= 80) level = 'critical';
  else if (effectiveRisk >= 50) level = 'high';
  else if (effectiveRisk >= 25) level = 'medium';

  const signals: Signal[] = [];

  const locationEv = events.find((e) => e.type === 'LOCATION_JUMP');
  if (locationEv) {
    signals.push({
      name: 'LOCATION JUMP',
      detail: locationEv.message || 'Login from a city 900 km away within minutes',
      severity: 'critical',
    });
  }

  const deviceEv = events.find((e) => e.type === 'DEVICE_SWITCH');
  if (deviceEv) {
    signals.push({
      name: 'DEVICE SWITCH',
      detail: deviceEv.message || 'Unknown handset IMEI mismatch',
      severity: 'high',
    });
  }

  const otpEv = events.find((e) => e.type === 'OTP_FLOOD');
  if (otpEv) {
    signals.push({
      name: 'OTP FLOOD',
      detail: otpEv.message || '7 OTP requests in 40 seconds',
      severity: 'high',
    });
  }

  const carrierEv = events.find((e) => e.type === 'SIM_CHANGE' || e.type === 'SWAP_CONFIRMED');
  if (carrierEv) {
    signals.push({
      name: 'CARRIER TELEMETRY',
      detail: 'Recent IMSI provisioning trigger detected on carrier network',
      severity: 'critical',
    });
  }

  if (signals.length === 0) {
    signals.push({
      name: 'BASELINE INTEGRITY',
      detail: 'Consistent cell tower telemetry and single IMEI signature',
      severity: 'low',
    });
  }

  return {
    shield: 'sim',
    risk: effectiveRisk,
    threat: isConfirmed ? 'SIM Swap' : status === 'anomaly' ? 'Telecom Anomaly' : 'None',
    level,
    confidence: isConfirmed ? 0.98 : status === 'anomaly' ? 0.85 : 0.94,
    signals,
  };
}

function buildRedFlags(events: SimTelemetryEvent[]): SimRedFlag[] {
  const flags: SimRedFlag[] = [];

  for (const ev of events) {
    if (ev.type === 'LOCATION_JUMP') {
      flags.push({
        category: 'IMPOSSIBLE TRAVEL',
        title: 'Geographic Telemetry Velocity Violation',
        detail: 'Cell tower session shifted across 900+ km in under 11 minutes.',
      });
    } else if (ev.type === 'DEVICE_SWITCH') {
      flags.push({
        category: 'HARDWARE MIGRATION',
        title: 'Handset Hardware Signature Mismatch',
        detail: 'MSISDN re-registered with unknown radio equipment identity (IMEI).',
      });
    } else if (ev.type === 'OTP_FLOOD') {
      flags.push({
        category: 'CREDENTIAL PROBING',
        title: 'Rapid 2FA Invalidation Burst',
        detail: 'Multiple consecutive one-time passcode dispatches requested in 40s.',
      });
    } else if (ev.type === 'SWAP_CONFIRMED' || ev.type === 'SIM_CHANGE') {
      flags.push({
        category: 'CARRIER MUTATION',
        title: 'IMSI Circuit Re-allocation Confirmed',
        detail: 'Cellular network confirms physical subscriber identity replacement.',
      });
    }
  }

  return flags;
}
