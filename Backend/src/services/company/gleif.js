/**
 * gleif.js - Legal Entity Identifier (GLEIF) public registry lookup.
 * CC0 open data, no API key required, 60 req/min rate limit.
 * Never throws. Sends ONLY sanitized company name.
 */

import env from '../../config/env.js';
import { normalizeName, sanitizeCompanyName } from './normalize.js';

const PROVIDER_NAME = 'GLEIF';

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
 * Searches GLEIF database for a legal entity name.
 *
 * @param {string} rawCompanyName
 * @param {{ signal?: AbortSignal }} [ctx]
 * @returns {Promise<{ name: string, status: 'FOUND'|'NOT_FOUND'|'UNAVAILABLE', detail: string, legalName?: string }>}
 */
export async function checkGleif(rawCompanyName, ctx = {}) {
  const sanitized = sanitizeCompanyName(rawCompanyName);
  if (!sanitized) {
    return {
      name: PROVIDER_NAME,
      status: 'NOT_FOUND',
      detail: 'Invalid company name for registry query',
    };
  }

  const endpoint = `https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=${encodeURIComponent(sanitized)}&page[size]=5`;

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.api+json',
      },
      signal: ctx?.signal,
    });

    if (res.status === 429) {
      return {
        name: PROVIDER_NAME,
        status: 'UNAVAILABLE',
        detail: 'Rate limit exceeded on registry',
      };
    }

    if (!res.ok) {
      return {
        name: PROVIDER_NAME,
        status: 'UNAVAILABLE',
        detail: `Registry responded with HTTP ${res.status}`,
      };
    }

    const json = await res.json();
    const records = json?.data || [];

    if (!Array.isArray(records) || records.length === 0) {
      return {
        name: PROVIDER_NAME,
        status: 'NOT_FOUND',
        detail: 'No entity found in GLEIF database',
      };
    }

    const normTarget = normalizeName(sanitized);

    for (const item of records) {
      const legalName = item?.attributes?.entity?.legalName?.name;
      if (legalName && typeof legalName === 'string') {
        const normLegal = normalizeName(legalName);

        // Strong name match: exact, contains, or distance <= 2
        const isMatch =
          normLegal === normTarget ||
          normLegal.includes(normTarget) ||
          normTarget.includes(normLegal) ||
          (normLegal.length >= 4 &&
            normTarget.length >= 4 &&
            levenshteinDistance(normLegal, normTarget) <= 2);

        if (isMatch) {
          const truncatedLegal = legalName.length > 50 ? `${legalName.slice(0, 47)}...` : legalName;
          return {
            name: PROVIDER_NAME,
            status: 'FOUND',
            detail: `Entity found in GLEIF records (${truncatedLegal})`,
            legalName,
          };
        }
      }
    }

    return {
      name: PROVIDER_NAME,
      status: 'NOT_FOUND',
      detail: 'No matching legal entity found in GLEIF',
    };
  } catch (err) {
    const isTimeout = err?.name === 'AbortError' || err?.code === 'ABORT_ERR';
    return {
      name: PROVIDER_NAME,
      status: 'UNAVAILABLE',
      detail: isTimeout ? 'Request timed out' : 'Registry service unavailable',
    };
  }
}
