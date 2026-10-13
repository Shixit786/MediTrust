import env from '../../config/env.js';
import { stripUrl } from './urlHelpers.js';

const PROVIDER_NAME = 'URLHAUS';

/**
 * Checks a URL against abuse.ch URLhaus URL lookup.
 * Uses POST https://urlhaus-api.abuse.ch/v1/url/ with Auth-Key header.
 *
 * @param {{ url: string, host: string }} urlInfo
 * @param {{ signal?: AbortSignal }} [ctx]
 * @returns {Promise<{ name: string, status: string, detail?: string }>}
 */
export async function check(urlInfo, ctx = {}) {
  const authKey =
    ctx?.apiKey !== undefined
      ? ctx.apiKey
      : process.env.URLHAUS_AUTH_KEY || env.URLHAUS_AUTH_KEY;

  if (!authKey) {
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

  const endpoint = 'https://urlhaus-api.abuse.ch/v1/url/';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Auth-Key': authKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ url: cleanUrl }),
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
    const queryStatus = data?.query_status;

    if (queryStatus === 'ok') {
      const threat = data?.threat || 'malware';
      return {
        name: PROVIDER_NAME,
        status: 'FLAGGED',
        detail: `Listed in URLhaus database (${threat})`,
      };
    }

    if (queryStatus === 'no_results') {
      return {
        name: PROVIDER_NAME,
        status: 'CLEAN',
        detail: 'Not listed in URLhaus',
      };
    }

    return {
      name: PROVIDER_NAME,
      status: 'UNAVAILABLE',
      detail: 'Unexpected response from URLhaus',
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
