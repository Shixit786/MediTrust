/**
 * scamRules.js - Pure rule engine for detecting scam indicators in text.
 * Shared across Job Shield and future Voice content analysis layers.
 * Completely decoupled from Express / HTTP concerns.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==============================================================================
// CONFIGURATION & CONSTANTS
// ==============================================================================
export const RULES_CONFIG = {
  MAX_HIGHLIGHTS: 40,
  MAX_RED_FLAGS: 10,
  MAX_RULES_SCORE: 100,
  COMBO_BONUS_EACH: 10,
  MAX_COMBO_BONUS: 25,
  SAFE_CONTEXT_REDUCTION: 15,
  NEGATION_WINDOW_CHARS: 25,
  EMERGENCY_PROXIMITY_CHARS: 60,
  SEVERITY_THRESHOLDS: {
    CRITICAL: 40,
    HIGH: 25,
    MEDIUM: 15,
  },
};

// Relation dictionary for emergency detection
const RELATIONS_MAP = {
  mama: 'uncle (mama)',
  mami: 'aunt (mami)',
  papa: 'father',
  pitaji: 'father',
  maa: 'mother',
  mataji: 'mother',
  bhai: 'brother',
  bhaiya: 'brother',
  behen: 'sister',
  beta: 'son',
  beti: 'daughter',
  dadi: 'grandmother',
  dada: 'grandfather',
  nana: 'grandfather',
  nani: 'grandmother',
  chacha: 'uncle (chacha)',
  chachi: 'aunt (chachi)',
  uncle: 'uncle',
  aunty: 'aunt',
  relative: 'relative',
  son: 'son',
  daughter: 'daughter',
  mother: 'mother',
  father: 'father',
  brother: 'brother',
  sister: 'sister',
  friend: 'friend',
  dost: 'friend',
  'मामा': 'uncle (mama)',
  'मामी': 'aunt (mami)',
  'पापा': 'father',
  'माँ': 'mother',
  'भाई': 'brother',
  'बहन': 'sister',
  'बेटा': 'son',
  'बेटी': 'daughter',
  'दादी': 'grandmother',
  'दादा': 'grandfather',
  'नाना': 'grandfather',
  'नानी': 'grandmother',
  'चाचा': 'uncle',
  'चाची': 'aunt',
  'दोस्त': 'friend',
  'रिश्तेदार': 'relative',
};

const EMERGENCY_WORDS = [
  'bimar',
  'bimaar',
  'bemaar',
  'accident',
  'hospital',
  'aspatal',
  'surgery',
  'operation',
  'icu',
  'serious',
  'critical',
  'admitted',
  'bharti',
  'coma',
  'heart attack',
  'cardiac',
  'id proof',
  'बीमार',
  'एक्सीडेंट',
  'अस्पताल',
  'सर्जरी',
  'ऑपरेशन',
  'आईसीयू',
  'गंभीर',
  'भर्ती',
  'कोमा',
  'हार्ट अटैक',
];

const NEGATION_REGEX = /(?:no|not|never|without|free\s+of|nahi|na|kabhi\s*nahi|koi\s*fee\s*nahi|do\s+not\s+ask)\b/i;

const SAFE_CONTEXT_REGEX = /\b(?:written\s+(?:test|exam)|interview\s+(?:schedule|invitation|call\s*letter)|official\s+careers?\s+portal|selection\s+process|no\s+charges?\s+applicable|strictly\s+free\s+of\s+cost)\b/i;

// Category metadata for titles
const CATEGORY_TITLES = {
  UPFRONT_PAYMENT: 'Upfront Payment or Deposit Demand',
  OTP_REQUEST: 'OTP or Security PIN Request',
  URGENCY: 'Artificial Urgency & Time Pressure',
  UNREALISTIC_SALARY: 'Unrealistic Compensation Claims',
  SUSPICIOUS_LINK: 'Suspicious Action Link',
  PERSONAL_DATA_REQUEST: 'Unsecured Identity or Financial Data Request',
  MEDICAL_EMERGENCY_LURE: 'Medical Emergency Family Lure',
  AUTHORITY_IMPERSONATION: 'Impersonation of Public or Health Authority',
  ISOLATION_SECRECY: 'Coercive Secrecy and Call Isolation',
  OFF_PLATFORM_CHANNEL: 'Off-Platform Recruitment Channel',
  REMOTE_ACCESS_APP: 'Remote Access Tool Installation',
  HEALTHCARE_JOB_LURE: 'Healthcare or Overseas Placement Fee',
};

// Load and compile patterns once at module startup
const patternsFilePath = path.join(__dirname, '..', 'data', 'scamPatterns.json');
const rawPatterns = JSON.parse(readFileSync(patternsFilePath, 'utf-8'));

export const COMPILED_PATTERNS = rawPatterns.map((p) => ({
  ...p,
  compiledRegex: new RegExp(p.regex, p.flags.includes('g') ? p.flags : `${p.flags}g`),
}));

/**
 * Checks whether an upfront payment, OTP or secrecy match is preceded by a negation.
 * Respects sentence boundaries so previous clauses do not bleed into subsequent instructions.
 */
function isNegated(text, matchStart) {
  const windowStart = Math.max(0, matchStart - RULES_CONFIG.NEGATION_WINDOW_CHARS);
  let precedingSubstr = text.slice(windowStart, matchStart);

  // If a sentence terminator occurs before the match, scope only to the current clause
  const lastBoundary = Math.max(
    precedingSubstr.lastIndexOf('.'),
    precedingSubstr.lastIndexOf('!'),
    precedingSubstr.lastIndexOf('?')
  );
  if (lastBoundary !== -1) {
    precedingSubstr = precedingSubstr.slice(lastBoundary + 1);
  }

  return NEGATION_REGEX.test(precedingSubstr);
}

/**
 * Scans for medical emergency relation lures.
 */
function detectMedicalEmergency(text) {
  const lower = text.toLowerCase();
  const relationKeys = Object.keys(RELATIONS_MAP);

  for (const rel of relationKeys) {
    const relRegex = new RegExp(`(?:^|\\s|[.,;!?])${rel}(?:$|\\s|[.,;!?])`, 'iu');
    const relMatch = relRegex.exec(lower);
    if (!relMatch) continue;

    const relIndex = relMatch.index;

    // Check for an emergency keyword within proximity
    for (const em of EMERGENCY_WORDS) {
      const emRegex = new RegExp(`(?:^|\\s|[.,;!?])${em}(?:$|\\s|[.,;!?])`, 'iu');
      const emMatch = emRegex.exec(lower);
      if (!emMatch) continue;

      const emIndex = emMatch.index;
      if (Math.abs(relIndex - emIndex) <= RULES_CONFIG.EMERGENCY_PROXIMITY_CHARS) {
        const start = Math.min(relIndex, emIndex);
        const end = Math.max(relIndex + rel.length, emIndex + em.length);
        return {
          detected: true,
          relation: RELATIONS_MAP[rel],
          matchSpan: { start, end },
        };
      }
    }
  }

  return { detected: false, relation: null, matchSpan: null };
}

/**
 * Analyzes arbitrary text against heuristic patterns, returning highlights,
 * distinct red flags, emergency claim flags, and an aggregate rule score.
 *
 * @param {string} text Raw or normalized candidate message text
 * @returns {object} Rule engine analysis payload
 */
export function analyzeText(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return {
      matches: [],
      categories: [],
      rulesScore: 0,
      highlights: [],
      redFlags: [],
      emergency_claim: { detected: false, relation: null, escalated: false },
    };
  }

  const rawMatches = [];
  const triggeredPatternIds = new Set();
  const categoryWeights = {};

  // 1. Evaluate compiled regex patterns
  for (const pattern of COMPILED_PATTERNS) {
    pattern.compiledRegex.lastIndex = 0;
    let match;
    while ((match = pattern.compiledRegex.exec(text)) !== null) {
      const matchStart = match.index;
      const matchEnd = match.index + match[0].length;

      // Check negation guard for sensitive categories
      if (
        (pattern.category === 'UPFRONT_PAYMENT' ||
          pattern.category === 'OTP_REQUEST' ||
          pattern.category === 'ISOLATION_SECRECY') &&
        isNegated(text, matchStart)
      ) {
        continue;
      }

      triggeredPatternIds.add(pattern.id);
      categoryWeights[pattern.category] = (categoryWeights[pattern.category] || 0) + pattern.weight;

      rawMatches.push({
        id: pattern.id,
        category: pattern.category,
        start: matchStart,
        end: matchEnd,
        weight: pattern.weight,
        reason: pattern.reason,
        healthcare: Boolean(pattern.healthcare),
      });

      if (!pattern.compiledRegex.global) break;
    }
  }

  // 2. Evaluate Medical Emergency Lure
  const emCheck = detectMedicalEmergency(text);
  let isEscalated = false;

  if (emCheck.detected) {
    const emPatternId = 'emergency_family_lure';
    const emCategory = 'MEDICAL_EMERGENCY_LURE';
    const emWeight = 30;

    triggeredPatternIds.add(emPatternId);
    categoryWeights[emCategory] = (categoryWeights[emCategory] || 0) + emWeight;

    if (emCheck.matchSpan) {
      rawMatches.push({
        id: emPatternId,
        category: emCategory,
        start: emCheck.matchSpan.start,
        end: emCheck.matchSpan.end,
        weight: emWeight,
        reason: `Medical emergency claim involving reported family member (${emCheck.relation})`,
        healthcare: true,
      });
    }
  }

  // Determine emergency claim escalation
  const hasPayment = categoryWeights['UPFRONT_PAYMENT'] > 0;
  const hasOtp = categoryWeights['OTP_REQUEST'] > 0;
  const hasSecrecy = categoryWeights['ISOLATION_SECRECY'] > 0;

  if (emCheck.detected && (hasPayment || hasOtp || hasSecrecy)) {
    isEscalated = true;
  }

  const emergency_claim = {
    detected: emCheck.detected,
    relation: emCheck.relation,
    escalated: isEscalated,
  };

  // 3. Resolve highlights: sort by start offset and remove overlaps (keep highest weight)
  rawMatches.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return b.weight - a.weight;
  });

  const highlights = [];
  for (const item of rawMatches) {
    if (highlights.length >= RULES_CONFIG.MAX_HIGHLIGHTS) break;

    // Check collision with already accepted highlights
    const overlaps = highlights.some(
      (h) => Math.max(h.start, item.start) < Math.min(h.end, item.end)
    );

    if (!overlaps && item.start < item.end) {
      highlights.push({
        start: item.start,
        end: item.end,
        category: item.category,
        reason: item.reason,
      });
    }
  }

  highlights.sort((a, b) => a.start - b.start);

  // 4. Build distinct Red Flags (at most 10 categories)
  const redFlags = [];
  const distinctCategories = Object.keys(categoryWeights);

  for (const cat of distinctCategories) {
    if (redFlags.length >= RULES_CONFIG.MAX_RED_FLAGS) break;

    const totalWeight = categoryWeights[cat];
    let severity = 'low';
    if (totalWeight >= RULES_CONFIG.SEVERITY_THRESHOLDS.CRITICAL) {
      severity = 'critical';
    } else if (totalWeight >= RULES_CONFIG.SEVERITY_THRESHOLDS.HIGH) {
      severity = 'high';
    } else if (totalWeight >= RULES_CONFIG.SEVERITY_THRESHOLDS.MEDIUM) {
      severity = 'medium';
    }

    // Find sample matching reason
    const sampleMatch = rawMatches.find((m) => m.category === cat);
    const detail = sampleMatch ? sampleMatch.reason : `Pattern detected in category ${cat}`;
    const healthcare = rawMatches.some((m) => m.category === cat && m.healthcare);

    redFlags.push({
      category: cat,
      title: CATEGORY_TITLES[cat] || cat,
      detail,
      healthcare,
      severity,
    });
  }

  // 5. Calculate base score from sum of weights of DISTINCT pattern IDs
  let rawScore = 0;
  for (const patternId of triggeredPatternIds) {
    const pattern = COMPILED_PATTERNS.find((p) => p.id === patternId);
    if (pattern) {
      rawScore += pattern.weight;
    } else if (patternId === 'emergency_family_lure') {
      rawScore += 30;
    }
  }

  // 6. Combo bonuses (+10 each, max +25 total)
  let comboBonus = 0;
  if (hasPayment && categoryWeights['URGENCY'] > 0) {
    comboBonus += RULES_CONFIG.COMBO_BONUS_EACH;
  }
  if (hasOtp && distinctCategories.length > 1) {
    comboBonus += RULES_CONFIG.COMBO_BONUS_EACH;
  }
  if (emergency_claim.detected && hasPayment) {
    comboBonus += RULES_CONFIG.COMBO_BONUS_EACH;
  }

  comboBonus = Math.min(RULES_CONFIG.MAX_COMBO_BONUS, comboBonus);

  // Safe-context mitigation (slight reduction if official careers language is present and no high-risk flags)
  let safeMitigation = 0;
  if (SAFE_CONTEXT_REGEX.test(text) && !hasPayment && !hasOtp && !emergency_claim.detected) {
    safeMitigation = RULES_CONFIG.SAFE_CONTEXT_REDUCTION;
  }

  const rulesScore = Math.max(
    0,
    Math.min(RULES_CONFIG.MAX_RULES_SCORE, rawScore + comboBonus - safeMitigation)
  );

  return {
    matches: rawMatches,
    categories: distinctCategories,
    rulesScore,
    highlights,
    redFlags,
    emergency_claim,
  };
}
