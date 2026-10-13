import { explain, templateExplanation } from '../llm.service.js';

const SIM_SYSTEM_PROMPT = `You are MediTrust AI Telecom Identity Monitor.
Evaluate the simulated carrier telemetry indicators provided in the data.
- Describe observed anomaly patterns and their security significance in English.
- Treat this strictly as an early warning, not definitive proof of fraud.
- Max 80 words. Never mention phone numbers, personal identities, or specific individuals.
- Frame all findings calmly and constructively.`;

/**
 * In-memory explanation cache: sortedTypes + score -> { summary_en, provider }
 */
const explanationCache = new Map();

/**
 * Builds AI explanation for a SIM profile state.
 *
 * @param {Object} options
 * @param {Array<Object>} options.events
 * @param {number} options.riskScore
 * @param {string} options.level
 * @param {string} options.threat
 * @param {boolean} options.frozen
 * @param {Array<Object>} [options.signals]
 * @returns {Promise<{ summary_en: string, provider: string }>}
 */
export async function getSimAiExplanation({
  events = [],
  riskScore = 0,
  level = 'low',
  threat = 'No Strong SIM Anomaly',
  frozen = false,
  signals = [],
} = {}) {
  // Extract distinct event types sorted for stable caching
  const types = Array.from(new Set(events.map((e) => e.type || e))).sort();
  const cacheKey = `sim_ai:${types.join(',')}:${riskScore}:${frozen ? 1 : 0}`;

  if (explanationCache.has(cacheKey)) {
    return explanationCache.get(cacheKey);
  }

  // Construct privacy-safe payload: strictly NO phone numbers or masked numbers
  const safeData = {
    event_types: types,
    event_titles: events.map((e) => e.title || e.type).slice(0, 5),
    risk_score: riskScore,
    level,
    frozen,
    threat,
  };

  try {
    const res = await explain({
      system: SIM_SYSTEM_PROMPT,
      user: JSON.stringify(safeData),
      cacheKey,
      shield: 'sim',
      risk: riskScore,
      level,
      threat,
      signals,
    });

    const result = {
      summary_en: res.text || getFastSimTemplateSummary({ riskScore, level, threat, signals, frozen }),
      provider: res.provider || 'template',
    };

    explanationCache.set(cacheKey, result);
    return result;
  } catch {
    const fallbackText = getFastSimTemplateSummary({ riskScore, level, threat, signals, frozen });
    return {
      summary_en: fallbackText,
      provider: 'template',
    };
  }
}

/**
 * Instant synchronous template summary for fast live socket broadcasts.
 */
export function getFastSimTemplateSummary({
  riskScore = 0,
  level = 'low',
  threat = 'No Strong SIM Anomaly',
  signals = [],
  frozen = false,
} = {}) {
  if (frozen) {
    return 'Simulated account lockdown is active. Outgoing OTP delivery is paused and carrier gating prevents unauthorized SIM swap completion.';
  }

  return templateExplanation({
    shield: 'sim',
    risk: riskScore,
    level,
    threat,
    signals,
  });
}

export default {
  getSimAiExplanation,
  getFastSimTemplateSummary,
};
