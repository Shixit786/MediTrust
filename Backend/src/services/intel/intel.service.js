import crypto from 'node:crypto';
import env from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { combineUrlVerdict } from '../urlTools.js';
import { stripUrl, extractHost, isAllowlistedHost } from './urlHelpers.js';

import { check as checkGsb } from './googleSafeBrowsing.js';
import { check as checkVt } from './virustotal.js';
import { check as checkUrlhaus } from './urlhaus.js';
import { check as checkAbuseIpDb } from './abuseipdb.js';
import { check as checkSecurityTrails } from './securitytrails.js';

// Provider definitions in fixed contract order
const PROVIDERS = [
  { name: 'GOOGLE SAFE BROWSING', check: checkGsb, useHost: false, key: 'googleSafeBrowsing' },
  { name: 'VIRUSTOTAL', check: checkVt, useHost: false, key: 'virustotal' },
  { name: 'URLHAUS', check: checkUrlhaus, useHost: false, key: 'urlhaus' },
  { name: 'ABUSEIPDB', check: checkAbuseIpDb, useHost: true, key: 'abuseipdb' },
  { name: 'SECURITYTRAILS', check: checkSecurityTrails, useHost: true, key: 'securitytrails' },
];

// ==============================================================================
// IN-MEMORY LRU CACHE (100 ENTRIES)
// ==============================================================================
const MAX_CACHE_ENTRIES = 100;
const FAIL_CACHE_TTL_MS = 60_000; // 60s for failures
const cache = new Map();

function getCacheKey(providerName, target) {
  return crypto.createHash('sha256').update(`${providerName}:${target}`).digest('hex');
}

function getFromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  // LRU touch
  cache.delete(key);
  cache.set(key, entry);
  return entry.result;
}

function setInCache(key, result, ttlMs) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, {
    result,
    expiresAt: Date.now() + ttlMs,
  });
}

export function _clearCache() {
  cache.clear();
}

// ==============================================================================
// PER-PROVIDER CIRCUIT BREAKER
// 3 consecutive failures -> cooldown for 60 seconds
// ==============================================================================
const circuitBreakers = {
  'GOOGLE SAFE BROWSING': { failures: 0, cooldownUntil: 0 },
  VIRUSTOTAL: { failures: 0, cooldownUntil: 0 },
  URLHAUS: { failures: 0, cooldownUntil: 0 },
  ABUSEIPDB: { failures: 0, cooldownUntil: 0 },
  SECURITYTRAILS: { failures: 0, cooldownUntil: 0 },
};

function recordSuccess(providerName) {
  const cb = circuitBreakers[providerName];
  if (cb) cb.failures = 0;
}

function recordFailure(providerName) {
  const cb = circuitBreakers[providerName];
  if (cb) {
    cb.failures += 1;
    if (cb.failures >= 3) {
      cb.cooldownUntil = Date.now() + 60_000;
    }
  }
}

function isCooldown(providerName) {
  const cb = circuitBreakers[providerName];
  if (!cb) return false;
  return Date.now() < cb.cooldownUntil;
}

export function _resetCircuitBreakers() {
  for (const key of Object.keys(circuitBreakers)) {
    circuitBreakers[key].failures = 0;
    circuitBreakers[key].cooldownUntil = 0;
  }
}

/**
 * Returns current status of each threat provider without exposing secrets.
 * 'ready' | 'no_key' | 'cooldown'
 */
function hasKey(envKey) {
  if (process.env[envKey] !== undefined) {
    return Boolean(process.env[envKey]);
  }
  return Boolean(env[envKey]);
}

export function getIntelStatus() {
  const now = Date.now();

  const getStatus = (providerName, envKey) => {
    if (!hasKey(envKey)) return 'no_key';
    const cb = circuitBreakers[providerName];
    if (cb && now < cb.cooldownUntil) return 'cooldown';
    return 'ready';
  };

  return {
    googleSafeBrowsing: getStatus('GOOGLE SAFE BROWSING', 'GOOGLE_SAFE_BROWSING_API_KEY'),
    virustotal: getStatus('VIRUSTOTAL', 'VIRUSTOTAL_API_KEY'),
    urlhaus: getStatus('URLHAUS', 'URLHAUS_AUTH_KEY'),
    abuseipdb: getStatus('ABUSEIPDB', 'ABUSEIPDB_API_KEY'),
    securitytrails: getStatus('SECURITYTRAILS', 'SECURITYTRAILS_API_KEY'),
  };
}

/**
 * Executes a single provider check with circuit breaker, LRU caching, and timeout guards.
 */
async function executeProviderCheck(provider, urlInfo, globalSignal) {
  const providerName = provider.name;

  if (isCooldown(providerName)) {
    return {
      name: providerName,
      status: 'UNAVAILABLE',
      detail: 'Provider in cooldown',
    };
  }

  const target = provider.useHost
    ? (urlInfo.host || extractHost(urlInfo.url)).toLowerCase()
    : stripUrl(urlInfo.url);

  const cacheKey = getCacheKey(providerName, target);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  // Provider-level AbortController + Global deadline linkage
  const providerController = new AbortController();
  const timeoutMs = env.INTEL_TIMEOUT_MS || 4000;
  const timeoutId = setTimeout(() => providerController.abort(), timeoutMs);

  const onGlobalAbort = () => providerController.abort();
  if (globalSignal) {
    if (globalSignal.aborted) {
      providerController.abort();
    } else {
      globalSignal.addEventListener('abort', onGlobalAbort, { once: true });
    }
  }

  let result;
  try {
    result = await provider.check(urlInfo, { signal: providerController.signal });
  } catch {
    result = {
      name: providerName,
      status: 'UNAVAILABLE',
      detail: 'Internal provider error',
    };
  } finally {
    clearTimeout(timeoutId);
    if (globalSignal) {
      globalSignal.removeEventListener('abort', onGlobalAbort);
    }
  }

  // Update circuit breaker & cache
  if (result.status === 'UNAVAILABLE') {
    recordFailure(providerName);
    setInCache(cacheKey, result, FAIL_CACHE_TTL_MS);
  } else if (result.status === 'CLEAN' || result.status === 'SUSPICIOUS' || result.status === 'FLAGGED') {
    recordSuccess(providerName);
    setInCache(cacheKey, result, env.INTEL_CACHE_TTL_MS || 1800000);
  } else if (result.status === 'NOT_CHECKED') {
    setInCache(cacheKey, result, env.INTEL_CACHE_TTL_MS || 1800000);
  }

  return result;
}

/**
 * Enriches an array of URL results with live threat intelligence checks.
 *
 * @param {Array<object>} urlResults Array from evaluateUrlHeuristics
 * @returns {Promise<Array<object>>} Enriched URL results with sources[] and combined verdict
 */
export async function enrichUrls(urlResults = []) {
  if (!Array.isArray(urlResults) || urlResults.length === 0) {
    return [];
  }

  const startTime = Date.now();
  const maxUrls = env.INTEL_MAX_URLS || 3;

  // Determine top URLs by heuristic_score
  const indexed = urlResults.map((item, index) => ({ item, index }));
  indexed.sort((a, b) => (b.item.heuristic_score ?? 0) - (a.item.heuristic_score ?? 0));

  const eligibleIndices = new Set(indexed.slice(0, maxUrls).map((x) => x.index));

  // Global enrichment deadline: 6000 ms
  const globalController = new AbortController();
  const globalTimer = setTimeout(() => globalController.abort(), 6000);

  const telemetryEntries = [];

  try {
    // Build checks for all URLs
    const enrichPromises = urlResults.map(async (urlItem, index) => {
      const isEligible = eligibleIndices.has(index);

      // 1. Beyond max URLs ceiling
      if (!isEligible) {
        const dummySources = PROVIDERS.map((p) => ({
          name: p.name,
          status: 'NOT_CHECKED',
          detail: 'Not checked: link limit',
        }));
        return combineUrlVerdict(urlItem, dummySources);
      }

      // 2. Allowlisted host
      const host = urlItem.host || extractHost(urlItem.url);
      if (isAllowlistedHost(host)) {
        const allowlistSources = PROVIDERS.map((p) => ({
          name: p.name,
          status: 'NOT_CHECKED',
          detail: 'Allowlisted safe domain',
        }));
        return combineUrlVerdict(urlItem, allowlistSources);
      }

      // 3. Query all 5 providers concurrently
      const providerSettled = await Promise.allSettled(
        PROVIDERS.map((provider) =>
          executeProviderCheck(provider, urlItem, globalController.signal)
        )
      );

      const externalResults = providerSettled.map((res, pIdx) => {
        const providerName = PROVIDERS[pIdx].name;
        if (res.status === 'fulfilled' && res.value) {
          const val = res.value;
          telemetryEntries.push(`${PROVIDERS[pIdx].key}:${val.status.toLowerCase()}`);
          return val;
        }
        telemetryEntries.push(`${PROVIDERS[pIdx].key}:unavailable`);
        return {
          name: providerName,
          status: 'UNAVAILABLE',
          detail: 'Enrichment call failed',
        };
      });

      return combineUrlVerdict(urlItem, externalResults);
    });

    const enriched = await Promise.all(enrichPromises);
    const elapsedMs = Date.now() - startTime;

    // Privacy-compliant logging: NO URLs, hosts, IPs, or keys
    const checkedCount = Math.min(urlResults.length, maxUrls);
    logger.info(
      `[Intel Enrichment] urlsChecked=${checkedCount} elapsedMs=${elapsedMs} providers=[${telemetryEntries.join(', ')}]`
    );

    return enriched;
  } finally {
    clearTimeout(globalTimer);
  }
}
