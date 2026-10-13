import { clampScore, levelFromScore } from '../../utils/risk.js';

export const FUSION_CONFIG = {
  BASE_WEIGHTS: {
    voice: 0.30,
    job: 0.30,
    sim: 0.40,
  },
  ACTIVE_THRESHOLD: 30,
  CORRELATION_BONUSES: {
    TWO_ACTIVE: 10,
    THREE_ACTIVE: 20,
    ESCALATED_EMERGENCY: 5,
  },
  PEAK_GUARD_MULTIPLIER: 0.90,
  CONFIDENCE: {
    BASE: 0.50,
    PER_PRESENT: 0.10,
    MULTI_ACTIVE_BONUS: 0.10,
    SINGLE_PRESENT_PENALTY: 0.10,
    MIN: 0.30,
    MAX: 0.95,
  },
  DISCLAIMER:
    'Early warning, not proof. Fusion combines signals from separate checks and can be wrong. Verify through official channels.',
};

const SEVERITY_RANK = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Capitalizes shield name for signals prefix.
 */
function formatShieldPrefix(shield) {
  if (shield === 'sim') return 'SIM';
  return shield.charAt(0).toUpperCase() + shield.slice(1);
}

/**
 * Pure function: Evaluates cross-modal fusion risk scoring, activation, and confidence.
 *
 * @param {Object} inputs Normalized inputs for voice, job, sim
 * @returns {Object} Fused risk evaluation summary
 */
export function evaluateFusionRules(inputs = {}) {
  const shieldKeys = ['voice', 'job', 'sim'];
  const present = [];

  for (const key of shieldKeys) {
    const item = inputs[key];
    if (item && typeof item.risk === 'number' && !Number.isNaN(item.risk)) {
      const clampedRisk = clampScore(item.risk);
      present.push({
        shield: key,
        risk: clampedRisk,
        level: levelFromScore(clampedRisk),
        threat: String(item.threat || '').trim(),
        confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
        signals: Array.isArray(item.signals) ? item.signals : [],
        emergencyClaim: item.emergency_claim || null,
        frozen: Boolean(item.frozen),
        isActive: clampedRisk >= FUSION_CONFIG.ACTIVE_THRESHOLD,
      });
    }
  }

  // Fallback if no valid shields provided
  if (present.length === 0) {
    return {
      fusedRisk: 0,
      level: 'low',
      threat: 'No Coordinated Fraud Pattern',
      confidence: FUSION_CONFIG.CONFIDENCE.MIN,
      coverage: 'single',
      activeCount: 0,
      presentShields: [],
      mergedSignals: [],
      weightedScore: 0,
      bonus: 0,
      disclaimer: FUSION_CONFIG.DISCLAIMER,
    };
  }

  // 1. Re-normalize weights across present shields
  const sumNominalWeight = present.reduce(
    (acc, p) => acc + (FUSION_CONFIG.BASE_WEIGHTS[p.shield] || 0.33),
    0
  );

  let weightedScore = 0;
  for (const p of present) {
    const weight = (FUSION_CONFIG.BASE_WEIGHTS[p.shield] || 0.33) / sumNominalWeight;
    weightedScore += p.risk * weight;
  }

  // 2. Correlation bonuses
  const activeCount = present.filter((p) => p.isActive).length;
  let bonus = 0;
  if (activeCount === 3) {
    bonus += FUSION_CONFIG.CORRELATION_BONUSES.THREE_ACTIVE;
  } else if (activeCount === 2) {
    bonus += FUSION_CONFIG.CORRELATION_BONUSES.TWO_ACTIVE;
  }

  // Extra +5 when job emergency claim is escalated and voice or sim is active
  const jobPresent = present.find((p) => p.shield === 'job');
  const voiceActive = present.some((p) => p.shield === 'voice' && p.isActive);
  const simActive = present.some((p) => p.shield === 'sim' && p.isActive);

  if (jobPresent?.emergencyClaim?.escalated && (voiceActive || simActive)) {
    bonus += FUSION_CONFIG.CORRELATION_BONUSES.ESCALATED_EMERGENCY;
  }

  // 3. Peak guard: fused = max(weighted + bonus, round(0.90 * max(present risks)))
  const maxPresentRisk = Math.max(...present.map((p) => p.risk));
  const peakGuardScore = Math.round(FUSION_CONFIG.PEAK_GUARD_MULTIPLIER * maxPresentRisk);
  const fusedRisk = clampScore(Math.max(Math.round(weightedScore + bonus), peakGuardScore));
  const level = levelFromScore(fusedRisk);

  // 4. Threat label
  let threat = 'No Coordinated Fraud Pattern';
  if (activeCount === 3) {
    threat = 'Coordinated Multi-Stage Fraud Attack';
  } else if (activeCount === 2) {
    threat = 'Likely Coordinated Fraud Attempt';
  } else if (activeCount === 1) {
    const singleActive = present.find((p) => p.isActive);
    threat = singleActive?.threat || 'Single-Vector Threat Anomaly';
  } else {
    threat = 'No Coordinated Fraud Pattern';
  }

  // 5. Confidence calculation
  let conf = FUSION_CONFIG.CONFIDENCE.BASE + present.length * FUSION_CONFIG.CONFIDENCE.PER_PRESENT;
  if (activeCount >= 2) {
    conf += FUSION_CONFIG.CONFIDENCE.MULTI_ACTIVE_BONUS;
  }
  if (present.length === 1) {
    conf -= FUSION_CONFIG.CONFIDENCE.SINGLE_PRESENT_PENALTY;
  }
  const confidence = Math.min(
    FUSION_CONFIG.CONFIDENCE.MAX,
    Math.max(FUSION_CONFIG.CONFIDENCE.MIN, Math.round(conf * 100) / 100)
  );

  // 6. Coverage indicator
  const coverage =
    present.length === 3 ? 'full' : present.length === 2 ? 'partial' : 'single';

  // 7. Merged Signals: max 8, most severe first, prefixed with shield name
  const allSignals = [];
  for (const p of present) {
    const prefix = formatShieldPrefix(p.shield);
    for (const sig of p.signals) {
      if (!sig?.name) continue;
      const rawName = String(sig.name).trim();
      const rawDetail = String(sig.detail || '').trim();
      const severity = sig.severity || 'low';
      allSignals.push({
        name: `${prefix}: ${rawName}`.slice(0, 80),
        detail: rawDetail.slice(0, 200),
        severity,
        rawSeverity: SEVERITY_RANK[severity] || 1,
      });
    }
  }

  allSignals.sort((a, b) => b.rawSeverity - a.rawSeverity);
  const mergedSignals = allSignals.slice(0, 8).map(({ name, detail, severity }) => ({
    name,
    detail,
    severity,
  }));

  return {
    fusedRisk,
    level,
    threat,
    confidence,
    coverage,
    activeCount,
    presentShields: present,
    mergedSignals,
    weightedScore: Math.round(weightedScore),
    bonus,
    disclaimer: FUSION_CONFIG.DISCLAIMER,
  };
}

export default {
  FUSION_CONFIG,
  evaluateFusionRules,
};
