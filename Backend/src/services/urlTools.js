/**
 * urlTools.js - URL extraction and local heuristic threat engine.
 * Never fetches or opens any URL.
 * All user-facing reasons are English.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==============================================================================
// THREAT INTELLIGENCE SOURCES & CONTRACT CONSTANTS
//
// Source status contract for Stage 3A & Stage 3B:
// 'CLEAN' | 'SUSPICIOUS' | 'FLAGGED' | 'UNAVAILABLE' | 'NOT_CHECKED'
// In Stage 3A, external APIs are NOT_CHECKED; HEURISTIC ENGINE supplies real status.
// Stage 3B will populate the 5 external sources in the same order.
// ==============================================================================
export const SOURCE_NAMES = [
  'GOOGLE SAFE BROWSING',
  'VIRUSTOTAL',
  'URLHAUS',
  'ABUSEIPDB',
  'SECURITYTRAILS',
  'HEURISTIC ENGINE',
];

const KNOWN_SHORTENERS = new Set([
  'bit.ly',
  'tinyurl.com',
  'rb.gy',
  'cutt.ly',
  'is.gd',
  't.co',
  'ow.ly',
  'rebrand.ly',
  'shorturl.at',
  'v.gd',
  'buff.ly',
  'soo.gd',
  's.id',
]);

const SUSPICIOUS_TLDS = new Set([
  'xyz',
  'top',
  'click',
  'work',
  'live',
  'icu',
  'shop',
  'site',
  'online',
  'buzz',
  'tk',
  'ml',
  'ga',
  'cf',
  'gq',
  'monster',
  'fit',
  'rest',
  'surf',
]);

const HEALTHCARE_JOB_KEYWORDS = [
  'hospital',
  'care',
  'health',
  'ayushman',
  'nhm',
  'career',
  'jobs',
  'recruit',
  'insurance',
  'claim',
  'refund',
];

// Load known legitimate domains for look-alike detection
const knownDomainsPath = path.join(__dirname, '..', 'data', 'knownDomains.json');
const KNOWN_DOMAINS = JSON.parse(readFileSync(knownDomainsPath, 'utf-8'));

/**
 * Calculates Levenshtein edit distance between two strings.
 */
function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Strips trailing punctuation from matched URL candidates.
 */
function cleanUrlCandidate(candidate) {
  return candidate.replace(/[.,;!?)>\]"']+$/, '');
}

/**
 * Extracts normalized URLs from text, combining regex detections with any
 * external URL list (e.g. PDF annotations).
 *
 * @param {string} text Text body
 * @param {string[]} extraUrls Additional URLs (e.g. from PDF annotations)
 * @returns {Array<{ url: string, host: string }>} Max 10 unique URLs
 */
export function extractUrls(text = '', extraUrls = []) {
  const seenUrls = new Set();
  const results = [];

  // Match: http/https, www., or shorteners/common domains
  const urlRegex = /\b(?:https?:\/\/[^\s<>"'{}|\\^`]+|www\.[^\s<>"'{}|\\^`]+|(?:[a-zA-Z0-9-]+\.)+(?:com|in|org|net|xyz|top|live|shop|site|online|edu|gov|co|io|ly|gy)\b[^\s<>"'{}|\\^`]*)/gi;

  const rawCandidates = [];

  if (typeof text === 'string') {
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      rawCandidates.push(cleanUrlCandidate(match[0]));
    }
  }

  if (Array.isArray(extraUrls)) {
    for (const u of extraUrls) {
      if (typeof u === 'string' && u.trim().length > 0) {
        rawCandidates.push(cleanUrlCandidate(u.trim()));
      }
    }
  }

  for (const raw of rawCandidates) {
    if (results.length >= 10) break;

    let normalized = raw;
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }

    try {
      const parsed = new URL(normalized);
      const host = parsed.hostname.toLowerCase();

      // Ensure valid hostname with at least one dot or IP
      if (!host || (!host.includes('.') && !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host))) {
        continue;
      }

      if (!seenUrls.has(parsed.href)) {
        seenUrls.add(parsed.href);
        results.push({
          url: parsed.href,
          host,
        });
      }
    } catch {
      // Discard invalid URL syntax
    }
  }

  return results;
}

/**
 * Evaluates local heuristic risk on a single URL.
 *
 * @param {string} targetUrl Full URL
 * @param {string} host Hostname
 * @returns {object} Analysis result matching frontend Job Shield contracts
 */
export function evaluateUrlHeuristics(targetUrl, host) {
  let score = 0;
  const reasons = [];

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return {
      url: targetUrl,
      host: host || 'unknown',
      verdict: 'flagged',
      heuristic_score: 90,
      sources: SOURCE_NAMES.map((name) => ({
        name,
        status: name === 'HEURISTIC ENGINE' ? 'FLAGGED' : 'NOT_CHECKED',
      })),
      reasons: ['Malformed URL structure'],
    };
  }

  const cleanHost = parsed.hostname.toLowerCase();
  const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();

  // 1. IP address host (+65)
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(cleanHost) || cleanHost.startsWith('[')) {
    score += 65;
    reasons.push('Uses direct raw IP address instead of registered domain name');
  }

  // 2. Punycode (+60)
  if (cleanHost.includes('xn--')) {
    score += 60;
    reasons.push('Contains punycode (xn--) commonly used for internationalized homograph deception');
  }

  // 3. Known URL Shortener (+40)
  if (KNOWN_SHORTENERS.has(cleanHost)) {
    score += 40;
    reasons.push(`URL disguised using public shortener (${cleanHost})`);
  }

  // 4. Suspicious TLD (+35)
  const hostParts = cleanHost.split('.');
  const tld = hostParts[hostParts.length - 1];
  if (SUSPICIOUS_TLDS.has(tld)) {
    score += 35;
    reasons.push(`Domain uses high-abuse top-level domain (.${tld})`);
  }

  // 5. Excessive hyphens in host (+25)
  const hyphenCount = (cleanHost.match(/-/g) || []).length;
  if (hyphenCount >= 3) {
    score += 25;
    reasons.push(`Domain contains ${hyphenCount} hyphens, indicating potential brand stuffing`);
  }

  // 6. Excessive subdomains / labels (+25)
  if (hostParts.length >= 4 && !cleanHost.endsWith('.gov.in') && !cleanHost.endsWith('.nic.in')) {
    score += 25;
    reasons.push(`Excessive subdomain hierarchy (${hostParts.length} labels)`);
  }

  // 7. @ in URL authority (+50)
  if (targetUrl.includes('@')) {
    score += 50;
    reasons.push('URL authority contains "@" character typical of credential phishing lures');
  }

  // 8. Very long URL (+15)
  if (targetUrl.length > 150) {
    score += 15;
    reasons.push('Abnormally long URL length (>150 characters)');
  }

  // 9. Plain HTTP with sensitive action terms (+30)
  if (
    parsed.protocol === 'http:' &&
    /(?:login|payment|fee|otp|verify|secure|account|signin)/.test(pathAndQuery)
  ) {
    score += 30;
    reasons.push('Unencrypted plain HTTP link soliciting credentials or payment details');
  }

  // 10. Healthcare / job keywords on non-official domains (+25)
  const isOfficialOrKnownDomain =
    cleanHost.endsWith('.gov.in') ||
    cleanHost.endsWith('.nic.in') ||
    cleanHost.endsWith('.edu') ||
    cleanHost.endsWith('.ac.in') ||
    KNOWN_DOMAINS.some((kd) => cleanHost === kd || cleanHost.endsWith('.' + kd));

  if (!isOfficialOrKnownDomain) {
    const matchedKeyword = HEALTHCARE_JOB_KEYWORDS.find(
      (kw) => cleanHost.includes(kw) || pathAndQuery.includes(kw)
    );
    if (matchedKeyword) {
      score += 25;
      reasons.push(
        `Contains official health/employment keyword '${matchedKeyword}' on non-governmental domain`
      );
    }
  }

  // 11. Look-alike typo-squatting detection against known legitimate domains (+50)
  let lookalikeFound = false;
  // Strip common tld for base brand check or compare registrable domain
  const candidateDomain = hostParts.slice(-2).join('.');
  for (const known of KNOWN_DOMAINS) {
    if (cleanHost === known || candidateDomain === known) {
      lookalikeFound = false;
      break;
    }
    const dist = levenshteinDistance(candidateDomain, known);
    if (dist >= 1 && dist <= 2 && Math.abs(candidateDomain.length - known.length) <= 2) {
      score += 50;
      reasons.push(`Suspicious similarity to official brand domain '${known}' (distance: ${dist})`);
      lookalikeFound = true;
      break;
    }
  }

  const finalScore = Math.min(100, score);

  let verdict = 'clean';
  let heuristicStatus = 'CLEAN';

  if (finalScore >= 60) {
    verdict = 'flagged';
    heuristicStatus = 'FLAGGED';
  } else if (finalScore >= 25) {
    verdict = 'suspicious';
    heuristicStatus = 'SUSPICIOUS';
  }

  // Build the 6 sources in the mandatory order
  const sources = SOURCE_NAMES.map((name) => ({
    name,
    status: name === 'HEURISTIC ENGINE' ? heuristicStatus : 'NOT_CHECKED',
  }));

  return {
    url: targetUrl,
    host: cleanHost,
    verdict,
    heuristic_score: finalScore,
    sources,
    reasons,
  };
}

/**
 * Runs extraction and heuristic evaluation across all URLs in text.
 *
 * @param {string} text Text message
 * @param {string[]} extraUrls Extra URLs (e.g. from PDF annotations)
 * @returns {Array<object>} Evaluated URL objects
 */
export function analyzeUrls(text = '', extraUrls = []) {
  const extracted = extractUrls(text, extraUrls);
  return extracted.map((item) => evaluateUrlHeuristics(item.url, item.host));
}

// ==============================================================================
// THREAT INTELLIGENCE COMBINER & VERDICT CONFIGURATION
// ==============================================================================
export const INTEL_SCORING_CONFIG = {
  BASE_FLAGGED_GSB_URLHAUS: 95,
  BASE_FLAGGED_VT: 90,
  BASE_FLAGGED_ABUSEIPDB: 80,
  BASE_SUSPICIOUS: 60,
  ADDITIONAL_BOOST: 5,
  MAX_SCORE: 100,
  CLEAN_THRESHOLD: 25,
  FLAGGED_THRESHOLD: 60,
  LIMITED_COVERAGE_THRESHOLD: 2,
};

/**
 * Combines local heuristic analysis with external threat intelligence sources
 * to produce a consolidated per-URL score, verdict, sources list, and note.
 *
 * @param {object} urlResult Local heuristic result from evaluateUrlHeuristics
 * @param {Array<{ name: string, status: string, detail?: string }>} externalSources External provider results
 * @returns {object} Consolidated URL evaluation matching frontend contracts
 */
export function combineUrlVerdict(urlResult, externalSources = []) {
  const sourceMap = new Map();
  if (Array.isArray(externalSources)) {
    for (const s of externalSources) {
      if (s?.name) {
        sourceMap.set(s.name, s);
      }
    }
  }

  const heuristicScore = urlResult.heuristic_score ?? 0;
  let heuristicStatus = 'CLEAN';
  if (heuristicScore >= INTEL_SCORING_CONFIG.FLAGGED_THRESHOLD) {
    heuristicStatus = 'FLAGGED';
  } else if (heuristicScore >= INTEL_SCORING_CONFIG.CLEAN_THRESHOLD) {
    heuristicStatus = 'SUSPICIOUS';
  }

  // Preserve mandatory fixed order
  const sources = SOURCE_NAMES.map((name) => {
    if (name === 'HEURISTIC ENGINE') {
      return {
        name,
        status: heuristicStatus,
      };
    }
    const found = sourceMap.get(name);
    return {
      name,
      status: found?.status || 'NOT_CHECKED',
      ...(found?.detail ? { detail: found.detail } : {}),
    };
  });

  const externalOnly = sources.filter((s) => s.name !== 'HEURISTIC ENGINE');
  const reachableSources = externalOnly.filter(
    (s) => s.status === 'CLEAN' || s.status === 'SUSPICIOUS' || s.status === 'FLAGGED'
  );
  const unavailableSources = externalOnly.filter((s) => s.status === 'UNAVAILABLE');
  const sourcesChecked = reachableSources.length;
  const sourcesUnavailable = unavailableSources.length;

  const gsb = sourceMap.get('GOOGLE SAFE BROWSING');
  const urlhaus = sourceMap.get('URLHAUS');
  const vt = sourceMap.get('VIRUSTOTAL');
  const abuse = sourceMap.get('ABUSEIPDB');

  let baseScore = 0;
  if (gsb?.status === 'FLAGGED' || urlhaus?.status === 'FLAGGED') {
    baseScore = INTEL_SCORING_CONFIG.BASE_FLAGGED_GSB_URLHAUS;
  } else if (vt?.status === 'FLAGGED') {
    baseScore = INTEL_SCORING_CONFIG.BASE_FLAGGED_VT;
  } else if (abuse?.status === 'FLAGGED') {
    baseScore = INTEL_SCORING_CONFIG.BASE_FLAGGED_ABUSEIPDB;
  } else if (externalOnly.some((s) => s.status === 'SUSPICIOUS')) {
    baseScore = INTEL_SCORING_CONFIG.BASE_SUSPICIOUS;
  }

  const triggeringSources = externalOnly.filter(
    (s) => s.status === 'FLAGGED' || s.status === 'SUSPICIOUS'
  );

  let intelScore = 0;
  if (triggeringSources.length > 0) {
    const additionalBoost = (triggeringSources.length - 1) * INTEL_SCORING_CONFIG.ADDITIONAL_BOOST;
    intelScore = Math.min(INTEL_SCORING_CONFIG.MAX_SCORE, baseScore + additionalBoost);
  }

  let finalScore;
  if (triggeringSources.length === 0 && heuristicScore < INTEL_SCORING_CONFIG.CLEAN_THRESHOLD) {
    finalScore = heuristicScore;
  } else {
    finalScore = Math.max(heuristicScore, intelScore);
  }

  let verdict = 'clean';
  if (finalScore >= INTEL_SCORING_CONFIG.FLAGGED_THRESHOLD) {
    verdict = 'flagged';
  } else if (finalScore >= INTEL_SCORING_CONFIG.CLEAN_THRESHOLD) {
    verdict = 'suspicious';
  }

  const reasons = [...(urlResult.reasons || [])];
  for (const src of triggeringSources) {
    if (src.detail && !reasons.includes(src.detail)) {
      reasons.push(src.detail);
    }
  }

  const combined = {
    ...urlResult,
    verdict,
    heuristic_score: heuristicScore,
    intel_score: intelScore,
    final_score: finalScore,
    sources,
    sources_checked: sourcesChecked,
    sources_unavailable: sourcesUnavailable,
    reasons,
  };

  if (sourcesChecked < INTEL_SCORING_CONFIG.LIMITED_COVERAGE_THRESHOLD) {
    combined.note = 'Limited threat-intelligence coverage.';
  }

  return combined;
}
