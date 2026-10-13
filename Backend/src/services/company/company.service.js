/**
 * company.service.js - Orchestrator for company verification, registry checks,
 * domain consistency, and company risk scoring.
 *
 * Contract checks order:
 * 1. KNOWN EMPLOYER LIST
 * 2. DOMAIN CONSISTENCY
 * 3. GLEIF
 * 4. OPENCORPORATES
 * 5. NAME LOOK-ALIKE
 *
 * Allowed Statuses:
 * VERIFIED | MATCH | MISMATCH | NOT_FOUND | UNAVAILABLE | NOT_CHECKED | SUSPICIOUS
 */

import crypto from 'node:crypto';
import env from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { normalizeName, sanitizeCompanyName, extractCompanyName } from './normalize.js';
import { matchKnownEmployer } from './knownEmployers.js';
import { evaluateDomainConsistency, extractContactDomains } from './domainConsistency.js';
import { checkGleif } from './gleif.js';
import { checkOpenCorporates } from './opencorporates.js';

// ==============================================================================
// COMPANY SCORING CONFIGURATION
// Additive risk rules (Cap: 100). Verification matches NEVER lower the score.
// ==============================================================================
export const COMPANY_SCORING_CONFIG = {
  LOOKALIKE_PENALTY: 60,
  KNOWN_DOMAIN_MISMATCH_PENALTY: 45,
  KNOWN_FREEMAIL_PENALTY: 25,
  UNRELATED_DOMAIN_PENALTY: 15,
  RECENT_REGISTRATION_PENALTY: 20,
  NOT_FOUND_REACHABLE_REGISTRY_PENALTY: 5,
  MAX_SCORE: 100,
};

export const REGISTRY_DISCLAIMER_NOTE =
  'Registry coverage is limited. A company not being found is not proof of fraud, and being found is not proof of a genuine offer.';

// ==============================================================================
// LRU CACHING & CIRCUIT BREAKER FOR EXTERNAL REGISTRIES
// ==============================================================================
const MAX_CACHE_ENTRIES = 100;
const FAIL_CACHE_TTL_MS = 60_000; // 60s
const cache = new Map();

function getCacheKey(provider, normName) {
  return crypto.createHash('sha256').update(`${provider}:${normName}`).digest('hex');
}

function getFromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.result;
}

function setInCache(key, result, ttlMs) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { result, expiresAt: Date.now() + ttlMs });
}

export function _clearCompanyCache() {
  cache.clear();
}

const circuitBreakers = {
  GLEIF: { failures: 0, cooldownUntil: 0 },
  OPENCORPORATES: { failures: 0, cooldownUntil: 0 },
};

function recordSuccess(provider) {
  if (circuitBreakers[provider]) {
    circuitBreakers[provider].failures = 0;
  }
}

function recordFailure(provider) {
  if (circuitBreakers[provider]) {
    circuitBreakers[provider].failures += 1;
    if (circuitBreakers[provider].failures >= 3) {
      circuitBreakers[provider].cooldownUntil = Date.now() + 60_000;
    }
  }
}

function isCooldown(provider) {
  if (!circuitBreakers[provider]) return false;
  return Date.now() < circuitBreakers[provider].cooldownUntil;
}

export function _resetCompanyCircuitBreakers() {
  for (const k of Object.keys(circuitBreakers)) {
    circuitBreakers[k].failures = 0;
    circuitBreakers[k].cooldownUntil = 0;
  }
}

/**
 * Executes a registry lookup with caching and circuit breaker guards.
 */
async function runRegistryCheck(providerName, queryFn, sanitizedName, globalSignal) {
  if (isCooldown(providerName)) {
    return {
      name: providerName,
      status: 'UNAVAILABLE',
      detail: 'Registry in cooldown',
    };
  }

  const norm = normalizeName(sanitizedName);
  const cacheKey = getCacheKey(providerName, norm);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  const timeoutMs = env.COMPANY_TIMEOUT_MS || 4000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onGlobalAbort = () => controller.abort();
  if (globalSignal) {
    if (globalSignal.aborted) controller.abort();
    else globalSignal.addEventListener('abort', onGlobalAbort, { once: true });
  }

  let result;
  try {
    result = await queryFn(sanitizedName, { signal: controller.signal });
  } catch {
    result = {
      name: providerName,
      status: 'UNAVAILABLE',
      detail: 'Registry request failed',
    };
  } finally {
    clearTimeout(timer);
    if (globalSignal) {
      globalSignal.removeEventListener('abort', onGlobalAbort);
    }
  }

  // Update breaker & cache
  if (result.status === 'UNAVAILABLE') {
    recordFailure(providerName);
    setInCache(cacheKey, result, FAIL_CACHE_TTL_MS);
  } else {
    recordSuccess(providerName);
    setInCache(cacheKey, result, env.COMPANY_CACHE_TTL_MS || 3600000);
  }

  return result;
}

/**
 * Computes the company risk score from verification findings.
 */
function calculateCompanyScore({
  knownMatch,
  domainResult,
  gleifResult,
  openCorpResult,
}) {
  let score = 0;

  // 1. Look-alike typo penalty (+60)
  if (knownMatch.lookalike) {
    score += COMPANY_SCORING_CONFIG.LOOKALIKE_PENALTY;
  }

  // 2. Known employer claimed with domain mismatch (+45)
  if ((knownMatch.exact || knownMatch.lookalike) && domainResult.status === 'MISMATCH') {
    score += COMPANY_SCORING_CONFIG.KNOWN_DOMAIN_MISMATCH_PENALTY;
  }

  // 3. Free-mail contact claiming known employer (+25)
  if ((knownMatch.exact || knownMatch.lookalike) && domainResult.hasFreeMail) {
    score += COMPANY_SCORING_CONFIG.KNOWN_FREEMAIL_PENALTY;
  }

  // 4. Name unrelated to its own domain (+15)
  if (!knownMatch.match && domainResult.status === 'UNRELATED') {
    score += COMPANY_SCORING_CONFIG.UNRELATED_DOMAIN_PENALTY;
  }

  // 5. Registered recently under 12 months (+20)
  if (openCorpResult?.isRecent) {
    score += COMPANY_SCORING_CONFIG.RECENT_REGISTRATION_PENALTY;
  }

  // 6. Not found in any reachable registry (+5)
  const gleifReachable = gleifResult && gleifResult.status !== 'UNAVAILABLE' && gleifResult.status !== 'NOT_CHECKED';
  const openCorpReachable = openCorpResult && openCorpResult.status !== 'UNAVAILABLE' && openCorpResult.status !== 'NOT_CHECKED';

  if (gleifReachable || openCorpReachable) {
    const foundAny =
      (gleifReachable && gleifResult.status === 'FOUND') ||
      (openCorpReachable && openCorpResult.status === 'FOUND') ||
      knownMatch.exact;

    if (!foundAny) {
      score += COMPANY_SCORING_CONFIG.NOT_FOUND_REACHABLE_REGISTRY_PENALTY;
    }
  }

  return Math.min(COMPANY_SCORING_CONFIG.MAX_SCORE, score);
}

/**
 * Assembles the checks array in the contract-prescribed order:
 * 1. KNOWN EMPLOYER LIST
 * 2. DOMAIN CONSISTENCY
 * 3. GLEIF
 * 4. OPENCORPORATES
 * 5. NAME LOOK-ALIKE
 */
function assembleChecks({
  candidateName,
  knownMatch,
  domainResult,
  gleifResult,
  openCorpResult,
}) {
  const checks = [];

  // 1. KNOWN EMPLOYER LIST
  if (knownMatch.exact) {
    checks.push({
      name: 'KNOWN EMPLOYER LIST',
      status: 'VERIFIED',
      detail: `Matched curated enterprise directory (${knownMatch.match.name})`,
    });
  } else if (knownMatch.lookalike) {
    checks.push({
      name: 'KNOWN EMPLOYER LIST',
      status: 'SUSPICIOUS',
      detail: `Possible look-alike variation of ${knownMatch.match.name}`,
    });
  } else {
    checks.push({
      name: 'KNOWN EMPLOYER LIST',
      status: 'NOT_FOUND',
      detail: 'Not listed on curated employer directory',
    });
  }

  // 2. DOMAIN CONSISTENCY
  let domainStatus = domainResult.status;
  if (domainResult.status === 'PLAUSIBLE') domainStatus = 'MATCH';
  if (domainResult.status === 'UNRELATED') domainStatus = 'MISMATCH';
  if (domainResult.status === 'NO_CONTACT') domainStatus = 'NOT_CHECKED';

  checks.push({
    name: 'DOMAIN CONSISTENCY',
    status: domainStatus,
    detail: domainResult.detail,
  });

  // 3. GLEIF
  checks.push({
    name: 'GLEIF',
    status: gleifResult.status,
    detail: gleifResult.detail,
  });

  // 4. OPENCORPORATES
  checks.push({
    name: 'OPENCORPORATES',
    status: openCorpResult.status,
    detail: openCorpResult.detail,
  });

  // 5. NAME LOOK-ALIKE
  if (knownMatch.lookalike) {
    checks.push({
      name: 'NAME LOOK-ALIKE',
      status: 'SUSPICIOUS',
      detail: `High phonetic or spelling similarity to official employer '${knownMatch.match.name}'`,
    });
  } else if (knownMatch.exact) {
    checks.push({
      name: 'NAME LOOK-ALIKE',
      status: 'MATCH',
      detail: 'Matches official registered brand name with no look-alike distortion',
    });
  } else {
    checks.push({
      name: 'NAME LOOK-ALIKE',
      status: 'NOT_CHECKED',
      detail: 'No registered brand look-alike detected',
    });
  }

  return checks;
}

/**
 * Primary entrypoint for company verification.
 * Runs GLEIF and OpenCorporates in parallel with a 5 s global deadline.
 * Never throws.
 *
 * @param {object} params
 * @param {string} [params.text] Raw text
 * @param {string|null} [params.llmName] LLM suggested company name
 * @param {string|null} [params.name] Explicit company name
 * @param {string[]} [params.contactDomains] Extracted contact domains
 * @returns {Promise<{ name: string|null, checks: Array<object>, company_score: number, note: string }>}
 */
export async function verifyCompany({ text = '', llmName = null, name = null, contactDomains = null }) {
  const startTime = Date.now();
  const rawCandidate = name || extractCompanyName(text, llmName);

  if (!rawCandidate) {
    return {
      name: null,
      checks: [],
      company_score: 0,
      note: 'No company name detected.',
    };
  }

  const sanitized = sanitizeCompanyName(rawCandidate);
  if (!sanitized) {
    return {
      name: rawCandidate.slice(0, 50),
      checks: [
        {
          name: 'KNOWN EMPLOYER LIST',
          status: 'NOT_FOUND',
          detail: 'Company name rejected due to invalid characters',
        },
        {
          name: 'DOMAIN CONSISTENCY',
          status: 'NOT_CHECKED',
          detail: 'Skipped domain check for invalid company name',
        },
        {
          name: 'GLEIF',
          status: 'NOT_FOUND',
          detail: 'Invalid company name for registry lookup',
        },
        {
          name: 'OPENCORPORATES',
          status: 'NOT_FOUND',
          detail: 'Invalid company name for registry lookup',
        },
        {
          name: 'NAME LOOK-ALIKE',
          status: 'NOT_CHECKED',
          detail: 'Skipped look-alike check for invalid name',
        },
      ],
      company_score: 0,
      note: REGISTRY_DISCLAIMER_NOTE,
    };
  }

  // 1. Curated employer list matching
  const knownMatch = matchKnownEmployer(sanitized);

  // 2. Domain consistency check
  const domains = contactDomains || extractContactDomains(text);
  const domainResult = evaluateDomainConsistency({
    companyName: sanitized,
    knownMatch,
    contactDomains: domains,
  });

  // 3. Parallel external registry lookups with 5s global deadline
  const globalController = new AbortController();
  const globalTimer = setTimeout(() => globalController.abort(), 5000);

  let gleifResult = { name: 'GLEIF', status: 'UNAVAILABLE', detail: 'Registry not queried' };
  let openCorpResult = { name: 'OPENCORPORATES', status: 'NOT_CHECKED', detail: 'No API token configured' };

  try {
    const [gleifSettled, openCorpSettled] = await Promise.allSettled([
      runRegistryCheck('GLEIF', checkGleif, sanitized, globalController.signal),
      runRegistryCheck('OPENCORPORATES', checkOpenCorporates, sanitized, globalController.signal),
    ]);

    if (gleifSettled.status === 'fulfilled' && gleifSettled.value) {
      gleifResult = gleifSettled.value;
    }

    if (openCorpSettled.status === 'fulfilled' && openCorpSettled.value) {
      openCorpResult = openCorpSettled.value;
    }
  } finally {
    clearTimeout(globalTimer);
  }

  const checks = assembleChecks({
    candidateName: sanitized,
    knownMatch,
    domainResult,
    gleifResult,
    openCorpResult,
  });

  const companyScore = calculateCompanyScore({
    knownMatch,
    domainResult,
    gleifResult,
    openCorpResult,
  });

  const elapsedMs = Date.now() - startTime;
  logger.info(
    `[Company Verification] companyFound=true elapsedMs=${elapsedMs} providers=[gleif:${gleifResult.status.toLowerCase()}, opencorporates:${openCorpResult.status.toLowerCase()}]`
  );

  return {
    name: sanitized,
    checks,
    company_score: companyScore,
    note: REGISTRY_DISCLAIMER_NOTE,
    _meta: {
      knownMatch,
      domainResult,
      gleifResult,
      openCorpResult,
    },
  };
}

/**
 * Refines preliminary company verification results if LLM later identifies a revised company name.
 * Avoids redundant external network queries by keeping registry findings and refining local checks.
 */
export function refineCompanyVerification(preliminaryResult, llmCompanyName, contactDomains = []) {
  if (!preliminaryResult || !llmCompanyName) return preliminaryResult;

  const sanitized = sanitizeCompanyName(llmCompanyName);
  if (!sanitized || normalizeName(sanitized) === normalizeName(preliminaryResult.name || '')) {
    return preliminaryResult;
  }

  const knownMatch = matchKnownEmployer(sanitized);
  const domainResult = evaluateDomainConsistency({
    companyName: sanitized,
    knownMatch,
    contactDomains,
  });

  const gleifResult = preliminaryResult._meta?.gleifResult || {
    name: 'GLEIF',
    status: 'NOT_FOUND',
    detail: 'Registry lookup completed on preliminary name',
  };

  const openCorpResult = preliminaryResult._meta?.openCorpResult || {
    name: 'OPENCORPORATES',
    status: 'NOT_CHECKED',
    detail: 'No API token configured',
  };

  const checks = assembleChecks({
    candidateName: sanitized,
    knownMatch,
    domainResult,
    gleifResult,
    openCorpResult,
  });

  const companyScore = calculateCompanyScore({
    knownMatch,
    domainResult,
    gleifResult,
    openCorpResult,
  });

  return {
    name: sanitized,
    checks,
    company_score: companyScore,
    note: REGISTRY_DISCLAIMER_NOTE,
  };
}
