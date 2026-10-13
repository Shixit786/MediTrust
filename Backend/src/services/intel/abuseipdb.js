import env from '../../config/env.js';
import { extractHost, resolveAndCheckIp } from './urlHelpers.js';

const PROVIDER_NAME = 'ABUSEIPDB';

/**
 * Checks host IP against AbuseIPDB v2 check endpoint.
 * Resolves host with 3s timeout, enforces SSRF/private range protections.
 *
 * @param {{ url: string, host: string }} urlInfo
 * @param {{ signal?: AbortSignal }} [ctx]
 * @returns {Promise<{ name: string, status: string, detail?: string }>}
 */
export async function check(urlInfo, ctx = {}) {
  const apiKey =
    ctx?.apiKey !== undefined
      ? ctx.apiKey
      : process.env.ABUSEIPDB_API_KEY || env.ABUSEIPDB_API_KEY;

  if (!apiKey) {
    return {
      name: PROVIDER_NAME,
      status: 'NOT_CHECKED',
      detail: 'No API key configured',
    };
  }

  const host = (urlInfo?.host || extractHost(urlInfo?.url)).trim();
  if (!host) {
    return {
      name: PROVIDER_NAME,
      status: 'NOT_CHECKED',
      detail: 'Invalid host',
    };
  }

  // Resolve IP and check SSRF / private IP range
  const { ip, isPrivate } = await resolveAndCheckIp(host);

  if (isPrivate) {
    return {
      name: PROVIDER_NAME,
      status: 'NOT_CHECKED',
      detail: 'Private or local address',
    };
  }

  if (!ip) {
    return {
      name: PROVIDER_NAME,
      status: 'UNAVAILABLE',
      detail: 'Unable to resolve host DNS',
    };
  }

  const endpoint = `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`;

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Key: apiKey,
        Accept: 'application/json',
      },
      signal: ctx?.signal,
    });

    if (res.status === 429) {
      return {
        name: PROVIDER_NAME,
        status: 'UNAVAILABLE',
        detail: 'Rate limit exceeded',
      };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        name: PROVIDER_NAME,
        status: 'UNAVAILABLE',
        detail: 'Authentication or quota failure',
      };
    }

    if (!res.ok) {
      return {
        name: PROVIDER_NAME,
        status: 'UNAVAILABLE',
        detail: `Upstream error ${res.status}`,
      };
    }

    const data = await res.json();
    const score = Number(data?.data?.abuseConfidenceScore ?? -1);

    if (score < 0) {
      return {
        name: PROVIDER_NAME,
        status: 'UNAVAILABLE',
        detail: 'Invalid response from AbuseIPDB',
      };
    }

    if (score >= 75) {
      return {
        name: PROVIDER_NAME,
        status: 'FLAGGED',
        detail: `High abuse confidence score (${score}%)`,
      };
    }

    if (score >= 25) {
      return {
        name: PROVIDER_NAME,
        status: 'SUSPICIOUS',
        detail: `Moderate abuse confidence score (${score}%)`,
      };
    }

    return {
      name: PROVIDER_NAME,
      status: 'CLEAN',
      detail: `Clean IP reputation (${score}% abuse score)`,
    };
  } catch (err) {
    const isTimeout = err?.name === 'AbortError' || err?.code === 'ABORT_ERR';
    return {
      name: PROVIDER_NAME,
      status: 'UNAVAILABLE',
      detail: isTimeout ? 'Request timed out' : 'Service unavailable',
    };
  }
}
