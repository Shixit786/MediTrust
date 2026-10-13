/**
 * jobResult.service.js - Pure functions for scoring, signals aggregation,
 * and contract serialization for Job Shield.
 */

import { buildShieldResult } from '../utils/response.js';
import { levelFromScore, clampScore } from '../utils/risk.js';

// ==============================================================================
// CONFIGURATION & WEIGHTS
// ==============================================================================
export const SCORING_CONFIG = {
  WEIGHTS_STANDARD: { rules: 0.45, url: 0.3, llm: 0.25 },
  WEIGHTS_NO_URL: { rules: 0.65, url: 0.0, llm: 0.35 },
  WEIGHTS_TEMPLATE_LLM: { rules: 0.7, url: 0.3, llm: 0.0 },
  WEIGHTS_RULES_ONLY: { rules: 1.0, url: 0.0, llm: 0.0 },
  PEAK_GUARD_MULTIPLIER: 0.85,
  BASE_CONFIDENCE: 0.6,
  CONFIDENCE_LLM_ALIGNMENT_BOOST: 0.15,
  CONFIDENCE_SHORT_TEXT_PENALTY: 0.15,
  CONFIDENCE_TEMPLATE_PENALTY: 0.1,
  CONFIDENCE_MIN: 0.3,
  CONFIDENCE_MAX: 0.9,
};

export const THREAT_LABELS = {
  EMERGENCY_SCAM: 'Medical Emergency Scam Pattern',
  HEALTHCARE_FRAUD: 'Healthcare Job Fraud',
  GENERAL_FRAUD: 'Fraudulent Job Offer or Phishing',
  SUSPICIOUS: 'Suspicious Message',
  CLEAN: 'No Strong Fraud Cues',
};

export const VERDICTS = {
  critical: 'High risk: this message demonstrates multiple patterns strongly indicative of recruitment fraud or phishing.',
  high: 'High risk: this message demonstrates multiple patterns strongly indicative of recruitment fraud or phishing.',
  medium: 'Suspicious indicators detected: treat this communication with caution and verify independently.',
  low: 'No strong fraud cues found. A low score does not guarantee an offer is genuine.',
};

export const DISCLAIMER =
  'Early warning, not proof. A low score does not guarantee an offer is genuine. Always verify the employer independently.';

const FREE_EMAIL_REGEX = /@[a-zA-Z0-9.-]*(?:gmail|yahoo|outlook|hotmail|rediffmail|proton|ymail)\.com\b/i;
const RECRUITER_CLAIM_REGEX = /\b(?:hr|recruiter|hiring|company|hospital|clinic|talent\s*acquisition|recruitment)\b/i;

/**
 * Calculates aggregate risk score and applied weights.
 * Supports Stage 3C company verification weighting (0.10) and peak guard.
 */
export function calculateJobRiskScore({
  rulesScore,
  urlMax,
  llmScore,
  companyScore = 0,
  hasCompany = false,
  isTemplateLlm,
  hasUrls,
}) {
  let baseWeights;

  if (hasUrls && !isTemplateLlm) {
    baseWeights = SCORING_CONFIG.WEIGHTS_STANDARD;
  } else if (!hasUrls && !isTemplateLlm) {
    baseWeights = SCORING_CONFIG.WEIGHTS_NO_URL;
  } else if (hasUrls && isTemplateLlm) {
    baseWeights = SCORING_CONFIG.WEIGHTS_TEMPLATE_LLM;
  } else {
    baseWeights = SCORING_CONFIG.WEIGHTS_RULES_ONLY;
  }

  // Company weight is 0.10 taken proportionally from other active weights; re-normalised when absent
  let weights;
  if (hasCompany) {
    weights = {
      rules: Number((baseWeights.rules * 0.9).toFixed(4)),
      url: Number((baseWeights.url * 0.9).toFixed(4)),
      llm: Number((baseWeights.llm * 0.9).toFixed(4)),
      company: 0.1,
    };
  } else {
    weights = {
      ...baseWeights,
      company: 0.0,
    };
  }

  const weighted =
    rulesScore * weights.rules +
    urlMax * weights.url +
    llmScore * weights.llm +
    companyScore * weights.company;

  // Peak guard ensures severe rule, URL, or company violations are not diluted
  const peakThreshold = Math.round(
    SCORING_CONFIG.PEAK_GUARD_MULTIPLIER * Math.max(rulesScore, urlMax, companyScore)
  );

  const finalScore = clampScore(Math.round(Math.max(weighted, peakThreshold)));

  return {
    risk: finalScore,
    weightsUsed: weights,
  };
}

/**
 * Determines threat classification label.
 */
export function determineThreatLabel({ risk, emergencyClaim, hasHealthcare }) {
  if (emergencyClaim?.escalated || (emergencyClaim?.detected && risk >= 60)) {
    return THREAT_LABELS.EMERGENCY_SCAM;
  }
  if (risk >= 60 && hasHealthcare) {
    return THREAT_LABELS.HEALTHCARE_FRAUD;
  }
  if (risk >= 60) {
    return THREAT_LABELS.GENERAL_FRAUD;
  }
  if (risk >= 30) {
    return THREAT_LABELS.SUSPICIOUS;
  }
  return THREAT_LABELS.CLEAN;
}

/**
 * Calculates confidence and reliability.
 */
export function calculateJobConfidence({
  textLength,
  isTemplateLlm,
  rulesScore,
  llmScore,
  registryFoundOrKnownMatch = false,
}) {
  let conf = SCORING_CONFIG.BASE_CONFIDENCE;

  if (!isTemplateLlm && Math.abs(llmScore - rulesScore) <= 25) {
    conf += SCORING_CONFIG.CONFIDENCE_LLM_ALIGNMENT_BOOST;
  }
  if (textLength < 60) {
    conf -= SCORING_CONFIG.CONFIDENCE_SHORT_TEXT_PENALTY;
  }
  if (isTemplateLlm) {
    conf -= SCORING_CONFIG.CONFIDENCE_TEMPLATE_PENALTY;
  }
  if (registryFoundOrKnownMatch) {
    conf += 0.05;
  }

  conf = Math.max(SCORING_CONFIG.CONFIDENCE_MIN, Math.min(SCORING_CONFIG.CONFIDENCE_MAX, conf));
  const roundedConf = Math.round(conf * 100) / 100;

  let reliability = 'high';
  if (roundedConf < 0.5) {
    reliability = 'low';
  } else if (roundedConf < 0.75) {
    reliability = 'medium';
  }

  return { confidence: roundedConf, reliability };
}

/**
 * Aggregates up to 8 signals for buildShieldResult.
 */
export function compileJobSignals(redFlags = [], urls = []) {
  const signals = [];

  // 1. External threat intelligence flagged signals (severity high or critical)
  for (const u of urls) {
    if (signals.length >= 8) break;
    if (Array.isArray(u.sources)) {
      for (const s of u.sources) {
        if (s.name === 'HEURISTIC ENGINE') continue;
        if (s.status === 'FLAGGED') {
          const isCritical = s.name === 'GOOGLE SAFE BROWSING' || s.name === 'URLHAUS';
          signals.push({
            name: `${s.name}: Malicious URL Detected`,
            detail: s.detail || `URL flagged as malicious by ${s.name}`,
            severity: isCritical ? 'critical' : 'high',
          });
          if (signals.length >= 8) break;
        }
      }
    }
  }

  // 2. Add red flags
  for (const rf of redFlags) {
    if (signals.length >= 8) break;
    signals.push({
      name: rf.title,
      detail: rf.detail,
      severity: rf.severity,
    });
  }

  // 3. Add URL reasons
  for (const u of urls) {
    if (signals.length >= 8) break;
    if (u.reasons && u.reasons.length > 0) {
      signals.push({
        name: `URL: ${u.host}`,
        detail: u.reasons[0],
        severity: u.verdict === 'flagged' ? 'high' : 'medium',
      });
    }
  }

  if (signals.length === 0) {
    signals.push({
      name: 'NO STRONG CUES',
      detail: 'No overt recruitment scam or phishing patterns detected.',
      severity: 'low',
    });
  }

  return signals.slice(0, 8);
}

/**
 * Builds the complete Job Shield response payload adhering to frontend contracts.
 */
export function buildJobResult({
  inputType,
  pdfMeta,
  extractedText,
  rulesAnalysis,
  urlAnalysis,
  aiAnalysis,
  companyAnalysis = null,
}) {
  const urlMax =
    urlAnalysis.length > 0
      ? Math.max(...urlAnalysis.map((u) => u.final_score ?? u.heuristic_score ?? 0))
      : 0;

  const companyScore = companyAnalysis?.company_score ?? 0;
  const hasCompany = Boolean(companyAnalysis?.name) || companyScore > 0;

  const isTemplateLlm = aiAnalysis.provider === 'template';
  const hasUrls = urlAnalysis.length > 0;

  const { risk, weightsUsed } = calculateJobRiskScore({
    rulesScore: rulesAnalysis.rulesScore,
    urlMax,
    llmScore: aiAnalysis.scam_probability,
    companyScore,
    hasCompany,
    isTemplateLlm,
    hasUrls,
  });

  const level = levelFromScore(risk);

  const hasHealthcare =
    rulesAnalysis.categories.includes('HEALTHCARE_JOB_LURE') ||
    rulesAnalysis.categories.includes('AUTHORITY_IMPERSONATION');

  const threat = determineThreatLabel({
    risk,
    emergencyClaim: rulesAnalysis.emergency_claim,
    hasHealthcare,
  });

  const registryFoundOrKnownMatch = Boolean(
    companyAnalysis?.checks?.some(
      (c) =>
        (c.name === 'KNOWN EMPLOYER LIST' && c.status === 'VERIFIED') ||
        ((c.name === 'GLEIF' || c.name === 'OPENCORPORATES') && c.status === 'FOUND')
    )
  );

  const { confidence, reliability } = calculateJobConfidence({
    textLength: extractedText.length,
    isTemplateLlm,
    rulesScore: rulesAnalysis.rulesScore,
    llmScore: aiAnalysis.scam_probability,
    registryFoundOrKnownMatch,
  });

  // Evaluate free email domain contact signal
  const hasFreeEmail = FREE_EMAIL_REGEX.test(extractedText);
  if (hasFreeEmail && RECRUITER_CLAIM_REGEX.test(extractedText)) {
    if (!rulesAnalysis.redFlags.some((rf) => rf.category === 'OFF_PLATFORM_CHANNEL')) {
      rulesAnalysis.redFlags.push({
        category: 'OFF_PLATFORM_CHANNEL',
        title: 'Free Webmail Recruiter Identity',
        detail: 'Recruiter or company claims using personal public email provider (e.g. Gmail/Yahoo)',
        healthcare: false,
        severity: 'medium',
      });
    }
  }

  // Employer impersonation check from company verification
  const isLookalike = companyAnalysis?.checks?.some(
    (c) => c.name === 'NAME LOOK-ALIKE' && c.status === 'SUSPICIOUS'
  );
  const isDomainMismatch = companyAnalysis?.checks?.some(
    (c) => c.name === 'DOMAIN CONSISTENCY' && c.status === 'MISMATCH'
  );
  const isKnownClaimed = companyAnalysis?.checks?.some(
    (c) => c.name === 'KNOWN EMPLOYER LIST' && (c.status === 'VERIFIED' || c.status === 'SUSPICIOUS')
  );

  if (isLookalike || (isDomainMismatch && isKnownClaimed)) {
    if (!rulesAnalysis.redFlags.some((rf) => rf.title === 'Possible employer impersonation')) {
      rulesAnalysis.redFlags.unshift({
        category: 'AUTHORITY_IMPERSONATION',
        title: 'Possible employer impersonation',
        detail: `Communication claims affiliation with ${companyAnalysis?.name || 'known employer'} but demonstrates conflicting authentication cues.`,
        healthcare: hasHealthcare,
        severity: 'high',
      });
    }
  }

  const signals = compileJobSignals(rulesAnalysis.redFlags, urlAnalysis);

  // Compute threat_intel metrics
  let urlsCheckedCount = 0;
  const reachableSources = new Set();
  const unavailableSources = new Set();

  for (const u of urlAnalysis) {
    if ((u.sources_checked ?? 0) > 0 || (u.sources_unavailable ?? 0) > 0) {
      urlsCheckedCount++;
    }
    if (Array.isArray(u.sources)) {
      for (const s of u.sources) {
        if (s.name === 'HEURISTIC ENGINE') continue;
        if (s.status === 'CLEAN' || s.status === 'SUSPICIOUS' || s.status === 'FLAGGED') {
          reachableSources.add(s.name);
        } else if (s.status === 'UNAVAILABLE') {
          unavailableSources.add(s.name);
        }
      }
    }
  }

  const reachableList = Array.from(reachableSources);
  const unavailableList = Array.from(unavailableSources);
  let coverage = 'none';
  if (reachableList.length === 5) {
    coverage = 'full';
  } else if (reachableList.length > 0) {
    coverage = 'partial';
  }

  const threatIntel = {
    urls_checked: urlsCheckedCount,
    sources_reachable: reachableList,
    sources_unavailable: unavailableList,
    coverage,
  };

  const registriesUnreachable = companyAnalysis?.checks?.some(
    (c) => (c.name === 'GLEIF' || c.name === 'OPENCORPORATES') && c.status === 'UNAVAILABLE'
  );
  const limitations = registriesUnreachable ? ['Company registries unreachable'] : [];

  const stagesPending = companyAnalysis
    ? []
    : reachableList.length > 0
    ? ['company_verification']
    : ['threat_intelligence', 'company_verification'];

  const extra = {
    input_type: inputType,
    pdf: pdfMeta,
    extracted_text: extractedText,
    urls: urlAnalysis,
    red_flags: rulesAnalysis.redFlags,
    highlights: rulesAnalysis.highlights,
    emergency_claim: rulesAnalysis.emergency_claim,
    company: {
      name: companyAnalysis?.name ?? aiAnalysis.company_name ?? null,
      checks: companyAnalysis?.checks ?? [],
      note: companyAnalysis?.note ?? 'No company name detected.',
    },
    contact_signals: {
      free_email_domain: hasFreeEmail,
    },
    ai: {
      summary_en: aiAnalysis.summary,
      patterns: aiAnalysis.tactics,
      confidence,
      provider: aiAnalysis.provider,
    },
    scores: {
      rules: rulesAnalysis.rulesScore,
      url: urlMax,
      llm: aiAnalysis.scam_probability,
      company: companyScore,
      weights_used: weightsUsed,
    },
    verdict: VERDICTS[level] || VERDICTS.low,
    reliability,
    disclaimer: DISCLAIMER,
    threat_intel: threatIntel,
    limitations: limitations.length > 0 ? limitations : undefined,
    stages_pending: stagesPending,
  };

  return buildShieldResult({
    shield: 'job',
    risk,
    threat,
    confidence,
    signals,
    extra,
  });
}
