export const LEVELS = Object.freeze(['low', 'medium', 'high', 'critical']);

/**
 * Clamps a score to an integer between 0 and 100.
 * Any NaN, null, or undefined value defaults to 0.
 */
export function clampScore(n) {
  if (n === null || n === undefined) return 0;
  const num = Number(n);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

/**
 * Returns the risk level corresponding to a given score:
 * - below 30: low
 * - 30 to 59: medium
 * - 60 to 79: high
 * - 80 and above: critical
 */
export function levelFromScore(score) {
  const clamped = clampScore(score);
  if (clamped < 30) return 'low';
  if (clamped <= 59) return 'medium';
  if (clamped <= 79) return 'high';
  return 'critical';
}
