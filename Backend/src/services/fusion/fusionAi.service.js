import { explain, templateExplanation } from '../llm.service.js';

const FUSION_SYSTEM_PROMPT = `You are MediTrust AI Fusion Engine, a cross-modal cybersecurity synthesis agent.
Evaluate the aggregated security telemetry provided in the untrusted data block.
- Describe the correlation between the observed vectors and the resulting threat pattern concisely in English.
- Treat this strictly as an early warning, not definitive proof of fraud.
- Max 100 words. Never mention individuals, specific organizations, or phone numbers.
- Deliver clear, calm, and practical forensic insight.`;

const aiCache = new Map();

/**
 * Builds AI explanation for a Fusion synthesis result.
 *
 * @param {Object} options
 * @param {number} options.fusedRisk
 * @param {string} options.level
 * @param {string} options.threat
 * @param {Array<Object>} options.presentShields
 * @param {Array<Object>} options.chainStages
 * @param {Array<Object>} options.signals
 * @returns {Promise<{ summary_en: string, provider: string }>}
 */
export async function getFusionAiExplanation({
  fusedRisk = 0,
  level = 'low',
  threat = 'No Coordinated Fraud Pattern',
  presentShields = [],
  chainStages = [],
  signals = [],
} = {}) {
  // Stable cache key from sorted shield levels + fused risk
  const shieldSignature = presentShields
    .map((p) => `${p.shield}:${p.level}:${p.risk}`)
    .sort()
    .join('|');
  const cacheKey = `fusion_ai:${shieldSignature}:${fusedRisk}`;

  if (aiCache.has(cacheKey)) {
    return aiCache.get(cacheKey);
  }

  // Safe structured payload: zero raw text from user
  const safePayload = {
    fused_risk: fusedRisk,
    level,
    threat,
    active_vectors: presentShields.filter((p) => p.isActive).map((p) => p.shield),
    chain_progression: chainStages.map((s) => ({
      stage: s.label,
      status: s.status,
    })),
    top_signals: signals.slice(0, 5).map((s) => String(s.name || '').slice(0, 80)),
  };

  try {
    const res = await explain({
      system: FUSION_SYSTEM_PROMPT,
      user: JSON.stringify(safePayload),
      cacheKey,
      shield: 'fusion',
      risk: fusedRisk,
      level,
      threat,
      signals,
    });

    const result = {
      summary_en: res.text || getFastFusionTemplateSummary({ fusedRisk, level, threat, signals }),
      provider: res.provider || 'template',
    };

    aiCache.set(cacheKey, result);
    return result;
  } catch {
    const fallbackText = getFastFusionTemplateSummary({ fusedRisk, level, threat, signals });
    return {
      summary_en: fallbackText,
      provider: 'template',
    };
  }
}

/**
 * Fast synchronous deterministic template summary.
 */
export function getFastFusionTemplateSummary({
  fusedRisk = 0,
  level = 'low',
  threat = 'No Coordinated Fraud Pattern',
  signals = [],
} = {}) {
  return templateExplanation({
    shield: 'fusion',
    risk: fusedRisk,
    level,
    threat,
    signals,
  });
}

export default {
  getFusionAiExplanation,
  getFastFusionTemplateSummary,
};
