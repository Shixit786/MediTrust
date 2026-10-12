import { buildShieldResult } from '../utils/response.js';
import { levelFromScore } from '../utils/risk.js';

export const THREAT_LABELS = Object.freeze({
  HIGH: 'Possible Deepfake Voice',
  MEDIUM: 'Possible Synthetic Voice',
  LOW: 'No Strong Synthetic Cues',
});

export const VERDICT_LABELS = Object.freeze({
  critical: 'High risk: the voice shows several cues common in AI-generated speech.',
  high: 'High risk: the voice shows several cues common in AI-generated speech.',
  medium: 'Mixed signals: some cues look synthetic, treat this call with caution.',
  low: 'No strong synthetic cues found. A low score does not guarantee a voice is real.',
});

export const WHY_IT_MATTERS =
  'Fake doctor and hospital callers can use cloned voices to create panic and ask for OTP or advance payment. Verify through another channel before sharing anything.';

export const FEATURE_PATTERN_MAP = Object.freeze({
  breathing_pattern: 'NO NATURAL BREATHING',
  pitch_variance: 'FLAT INTONATION',
  silence_purity: 'TOO-CLEAN BACKGROUND',
  harmonic_perfection: 'OVERLY CLEAN HARMONICS',
  energy_flatness: 'FLAT ENERGY',
  mfcc_anomaly: 'SYNTHETIC VOCAL-TRACT PATTERN',
  spectral_flux: 'UNNATURALLY STABLE SPECTRUM',
  highfreq_flatness: 'MISSING FRICATIVE NOISE',
  zero_crossing_rate: 'REGULAR SIGNAL TRANSITIONS',
});

/**
 * Returns threat descriptor based on risk score.
 */
export function getThreatLabel(risk) {
  if (risk >= 60) return THREAT_LABELS.HIGH;
  if (risk >= 35) return THREAT_LABELS.MEDIUM;
  return THREAT_LABELS.LOW;
}

/**
 * Evaluates reliability level from confidence number.
 */
export function getReliability(confidence) {
  if (typeof confidence !== 'number' || confidence < 0.5) return 'low';
  if (confidence < 0.75) return 'medium';
  return 'high';
}

/**
 * Extracts deterministic pattern strings from flagged features for the AI block.
 */
export function extractPatterns(features) {
  if (!Array.isArray(features)) return [];

  const flagged = features.filter(
    (f) => f.status === 'ANOMALOUS' || f.status === 'SUSPICIOUS'
  );

  // Sort descending by score to list strongest patterns first
  flagged.sort((a, b) => (b.score || 0) - (a.score || 0));

  const patterns = [];
  const seen = new Set();

  for (const f of flagged) {
    const pattern = FEATURE_PATTERN_MAP[f.id];
    if (pattern && !seen.has(pattern)) {
      seen.add(pattern);
      patterns.push(pattern);
    }
  }

  return patterns;
}

/**
 * Transforms upstream Python analysis output into the standardized frontend response shape.
 *
 * @param {Object} py Python analysis response object
 * @returns {Object} Standardized shield result
 */
export function buildVoiceResult(py) {
  const risk = py.overall_score;
  const level = levelFromScore(risk);
  const threat = getThreatLabel(risk);
  const confidence = py.confidence;
  const reliability = getReliability(confidence);

  // Filter features whose status is ANOMALOUS or SUSPICIOUS
  const flaggedFeatures = (py.features || [])
    .filter((f) => f.status === 'ANOMALOUS' || f.status === 'SUSPICIOUS')
    .sort((a, b) => b.score - a.score);

  const signals = [];

  // Top 6 flagged features
  for (const f of flaggedFeatures.slice(0, 6)) {
    let severity = 'medium';
    if (f.status === 'ANOMALOUS') {
      severity = f.score >= 85 ? 'critical' : 'high';
    }
    signals.push({
      name: f.name,
      detail: f.note,
      severity,
    });
  }

  // Up to 2 quality warnings
  const warnings = Array.isArray(py.quality?.warnings) ? py.quality.warnings : [];
  for (const warning of warnings.slice(0, 2)) {
    signals.push({
      name: 'AUDIO QUALITY',
      detail: warning,
      severity: 'low',
    });
  }

  // Fallback if no signals were produced
  if (signals.length === 0) {
    signals.push({
      name: 'NO STRONG CUES',
      detail: 'No feature crossed the suspicious threshold.',
      severity: 'low',
    });
  }

  const extra = {
    duration_sec: py.quality?.duration_sec ?? 0,
    features: py.features, // All 9 features preserved
    anomalies: py.anomalies || [],
    peaks: py.peaks || [],
    quality: py.quality,
    disclaimer: py.disclaimer,
    verdict: VERDICT_LABELS[level] || VERDICT_LABELS.low,
    reliability,
    why_it_matters: WHY_IT_MATTERS,
    verdict_hint: py.verdict_hint,
  };

  return buildShieldResult({
    shield: 'voice',
    risk,
    threat,
    confidence,
    signals,
    extra,
  });
}

/**
 * Builds the AI block for the frontend. English only; no Hindi/Hinglish keys.
 *
 * @param {Object} params
 * @param {string} params.summary English plain text explanation
 * @param {string[]} params.patterns List of uppercase pattern badges
 * @param {number} params.confidence Confidence score
 * @param {string} params.provider Provider used ('groq' | 'nvidia' | 'template')
 * @returns {Object}
 */
export function buildAiBlock({ summary, patterns, confidence, provider }) {
  return {
    summary_en: summary,
    patterns: Array.isArray(patterns) ? patterns : [],
    confidence,
    provider,
  };
}

export default {
  THREAT_LABELS,
  VERDICT_LABELS,
  WHY_IT_MATTERS,
  FEATURE_PATTERN_MAP,
  getThreatLabel,
  getReliability,
  extractPatterns,
  buildVoiceResult,
  buildAiBlock,
};
