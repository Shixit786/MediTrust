import { clampScore, levelFromScore, LEVELS } from './risk.js';

/**
 * Sends response data directly as bare JSON without any wrapper envelope.
 */
export function ok(res, data, status = 200) {
  return res.status(status).json(data);
}

/**
 * Normalizes and builds a standardized shield result matching the React frontend contract.
 *
 * @param {Object} options
 * @param {'voice'|'job'|'sim'} options.shield
 * @param {number} options.risk
 * @param {string} options.threat
 * @param {number} [options.confidence]
 * @param {Array<{name: string, detail: string, severity?: string}>} [options.signals]
 * @param {Object} [options.extra]
 * @returns {Object} Normalized shield result
 */
export function buildShieldResult({
  shield,
  risk,
  threat,
  confidence,
  signals = [],
  extra = {},
}) {
  const allowedShields = ['voice', 'job', 'sim', 'fusion'];
  if (!allowedShields.includes(shield)) {
    throw new Error(`Invalid shield identifier: ${shield}. Expected one of: ${allowedShields.join(', ')}`);
  }

  const clampedRisk = clampScore(risk);
  const level = levelFromScore(clampedRisk);

  const normalizedSignals = (Array.isArray(signals) ? signals : [])
    .slice(0, 20)
    .map((sig) => {
      const name = String(sig?.name || '').trim().slice(0, 80);
      const detail = String(sig?.detail || '').trim().slice(0, 300);
      const severity = LEVELS.includes(sig?.severity) ? sig.severity : 'low';
      return { name, detail, severity };
    });

  const result = {
    shield,
    risk: clampedRisk,
    threat: String(threat || '').trim(),
    level,
    ...(typeof confidence === 'number' && !Number.isNaN(confidence) ? { confidence } : {}),
    signals: normalizedSignals,
    createdAt: new Date().toISOString(),
    ...extra,
  };

  return result;
}
