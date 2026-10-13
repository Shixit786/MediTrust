import env from '../../config/env.js';
import { stripUrl } from './urlHelpers.js';

const PROVIDER_NAME = 'GOOGLE SAFE BROWSING';

/**
 * Checks a URL against Google Safe Browsing v4 threatMatches:find.
 * Never throws. Strips parameters and credentials prior to transmission.
 *
 * @param {{ url: string, host: string }} urlInfo
 * @param {{ signal?: AbortSignal }} [ctx]
 * @returns {Promise<{ name: string, status: string, detail?: string }>}
 */
export async function check(urlInfo, ctx = {}) {
  const apiKey =
    ctx?.apiKey !== undefined
      ? ctx.apiKey
      : process.env.GOOGLE_SAFE_BROWSING_API_KEY || env.GOOGLE_SAFE_BROWSING_API_KEY;

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

  const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(apiKey)}`;
  const body = {
    client: {
      clientId: 'meditrust-backend',
      clientVersion: '1.0.0',
    },
    threatInfo: {
      threatTypes: [
        'MALWARE',
        'SOCIAL_ENGINEERING',
        'UNWANTED_SOFTWARE',
        'POTENTIALLY_HARMFUL_APPLICATION',
      ],
      platformTypes: ['ANY_PLATFORM'],
      threatEntryTypes: ['URL'],
      threatEntries: [{ url: cleanUrl }],
    },
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
    if (data && Array.isArray(data.matches) && data.matches.length > 0) {
      const threatType = data.matches[0].threatType;
      const typeLabel =
        threatType === 'SOCIAL_ENGINEERING'
          ? 'phishing/social engineering'
          : threatType?.toLowerCase().replace(/_/g, ' ') || 'threat';

      return {
        name: PROVIDER_NAME,
        status: 'FLAGGED',
        detail: `Flagged as ${typeLabel} by Google Safe Browsing`,
      };
    }

    return {
      name: PROVIDER_NAME,
      status: 'CLEAN',
      detail: 'Not listed in Google Safe Browsing',
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
