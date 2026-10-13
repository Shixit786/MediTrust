import env from '../../config/env.js';
import { extractHost, getRegistrableDomain } from './urlHelpers.js';

const PROVIDER_NAME = 'SECURITYTRAILS';

/**
 * Checks domain records on SecurityTrails free domain endpoint.
 * Only sends registrable domain, handles free-tier 402/403 gracefully.
 *
 * @param {{ url: string, host: string }} urlInfo
 * @param {{ signal?: AbortSignal }} [ctx]
 * @returns {Promise<{ name: string, status: string, detail?: string }>}
 */
export async function check(urlInfo, ctx = {}) {
  const apiKey =
    ctx?.apiKey !== undefined
      ? ctx.apiKey
      : process.env.SECURITYTRAILS_API_KEY || env.SECURITYTRAILS_API_KEY;

  if (!apiKey) {
    return {
      name: PROVIDER_NAME,
      status: 'NOT_CHECKED',
      detail: 'No API key configured',
    };
  }

  const host = (urlInfo?.host || extractHost(urlInfo?.url)).trim();
  const domain = getRegistrableDomain(host);

  if (!domain) {
    return {
      name: PROVIDER_NAME,
      status: 'NOT_CHECKED',
      detail: 'IP address host',
    };
  }

  const endpoint = `https://api.securitytrails.com/v1/domain/${encodeURIComponent(domain)}`;

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        APIKEY: apiKey,
        Accept: 'application/json',
      },
      signal: ctx?.signal,
    });

    if (res.status === 402 || res.status === 403) {
      return {
        name: PROVIDER_NAME,
        status: 'UNAVAILABLE',
        detail: 'Plan does not include this data',
      };
    }

    if (res.status === 429) {
      return {
        name: PROVIDER_NAME,
        status: 'UNAVAILABLE',
        detail: 'Rate limit exceeded',
      };
    }

    if (res.status === 404) {
      return {
        name: PROVIDER_NAME,
        status: 'NOT_CHECKED',
        detail: 'Domain not found in SecurityTrails',
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
    const currentDns = data?.current_dns;

    if (!currentDns || typeof currentDns !== 'object') {
      return {
        name: PROVIDER_NAME,
        status: 'NOT_CHECKED',
        detail: 'No domain records found',
      };
    }

    // Inspect first_seen date across available DNS record sets
    const recordTypes = ['a', 'aaaa', 'mx', 'ns', 'soa'];
    let earliestFirstSeen = null;

    for (const type of recordTypes) {
      const rec = currentDns[type];
      if (rec?.first_seen) {
        const d = new Date(rec.first_seen);
        if (!isNaN(d.getTime())) {
          if (!earliestFirstSeen || d < earliestFirstSeen) {
            earliestFirstSeen = d;
          }
        }
      }
    }

    if (earliestFirstSeen) {
      const ageMs = Date.now() - earliestFirstSeen.getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (ageMs >= 0 && ageMs < thirtyDaysMs) {
        return {
          name: PROVIDER_NAME,
          status: 'SUSPICIOUS',
          detail: 'Very new domain',
        };
      }
    }

    // Check if domain actually has active records
    const hasValues = recordTypes.some((t) => {
      const v = currentDns[t]?.values;
      return Array.isArray(v) && v.length > 0;
    });

    if (hasValues) {
      return {
        name: PROVIDER_NAME,
        status: 'CLEAN',
        detail: 'Active DNS records present',
      };
    }

    return {
      name: PROVIDER_NAME,
      status: 'NOT_CHECKED',
      detail: 'No domain records found',
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
