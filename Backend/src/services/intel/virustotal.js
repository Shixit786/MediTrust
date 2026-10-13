import env from '../../config/env.js';
import { stripUrl } from './urlHelpers.js';

const PROVIDER_NAME = 'VIRUSTOTAL';

// Free tier rate guard tracking
const recentMinuteCalls = [];
const recentDayCalls = [];

export function _resetRateGuard() {
  recentMinuteCalls.length = 0;
  recentDayCalls.length = 0;
}

function checkRateGuard(now) {
  // Prune calls older than 60 seconds
  const oneMinuteAgo = now - 60_000;
  while (recentMinuteCalls.length > 0 && recentMinuteCalls[0] < oneMinuteAgo) {
    recentMinuteCalls.shift();
  }

  // Prune calls older than 24 hours
  const oneDayAgo = now - 86_400_000;
  while (recentDayCalls.length > 0 && recentDayCalls[0] < oneDayAgo) {
    recentDayCalls.shift();
  }

  if (recentMinuteCalls.length >= 4 || recentDayCalls.length >= 450) {
    return false;
  }

  recentMinuteCalls.push(now);
  recentDayCalls.push(now);
  return true;
}

/**
 * Checks a URL against VirusTotal v3 URL lookup.
 * Generates base64url id without padding, queries with x-apikey header.
 *
 * @param {{ url: string, host: string }} urlInfo
 * @param {{ signal?: AbortSignal }} [ctx]
 * @returns {Promise<{ name: string, status: string, detail?: string }>}
 */
export async function check(urlInfo, ctx = {}) {
  const apiKey =
    ctx?.apiKey !== undefined
      ? ctx.apiKey
      : process.env.VIRUSTOTAL_API_KEY || env.VIRUSTOTAL_API_KEY;

  if (!apiKey) {
    return {
      name: PROVIDER_NAME,
      status: 'NOT_CHECKED',
      detail: 'No API key configured',
    };
  }

  const cleanUrl = stripUrl(urlInfo?.url);
  if (!cleanUrl) {
    return {
      name: PROVIDER_NAME,
      status: 'NOT_CHECKED',
      detail: 'Invalid URL',
    };
  }

  const now = Date.now();
  if (!checkRateGuard(now)) {
    return {
      name: PROVIDER_NAME,
      status: 'UNAVAILABLE',
      detail: 'Quota guard',
    };
  }

  // Base64url without padding
  const urlId = Buffer.from(cleanUrl, 'utf-8').toString('base64url').replace(/=+$/, '');
  const endpoint = `https://www.virustotal.com/api/v3/urls/${urlId}`;

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'x-apikey': apiKey,
        Accept: 'application/json',
      },
      signal: ctx?.signal,
    });

    if (res.status === 404) {
      return {
        name: PROVIDER_NAME,
        status: 'NOT_CHECKED',
        detail: 'URL not seen by VirusTotal yet',
      };
    }

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
    const stats = data?.data?.attributes?.last_analysis_stats;
    if (!stats) {
      return {
        name: PROVIDER_NAME,
        status: 'UNAVAILABLE',
        detail: 'Invalid response format',
      };
    }

    const malicious = Number(stats.malicious || 0);
    const suspicious = Number(stats.suspicious || 0);

    if (malicious >= 3) {
      return {
        name: PROVIDER_NAME,
        status: 'FLAGGED',
        detail: `${malicious} security vendors flagged URL as malicious`,
      };
    }

    if (malicious >= 1 || suspicious >= 2) {
      return {
        name: PROVIDER_NAME,
        status: 'SUSPICIOUS',
        detail: `${malicious} malicious, ${suspicious} suspicious vendor detections`,
      };
    }

    return {
      name: PROVIDER_NAME,
      status: 'CLEAN',
      detail: 'No vendor detections on VirusTotal',
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
