/**
 * opencorporates.js - OpenCorporates Indian jurisdiction registry verification.
 * Only queries when API token is configured.
 * Never throws. Sends ONLY sanitized company name.
 */

import env from '../../config/env.js';
import { normalizeName, sanitizeCompanyName } from './normalize.js';

const PROVIDER_NAME = 'OPENCORPORATES';

function isYoungerThanTwelveMonths(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const ageMs = Date.now() - d.getTime();
  const twelveMonthsMs = 365 * 24 * 60 * 60 * 1000;
  return ageMs >= 0 && ageMs < twelveMonthsMs;
}

/**
 * Searches OpenCorporates for Indian registered entity.
 *
 * @param {string} rawCompanyName
 * @param {{ signal?: AbortSignal, token?: string }} [ctx]
 * @returns {Promise<{ name: string, status: 'FOUND'|'NOT_FOUND'|'UNAVAILABLE'|'NOT_CHECKED', detail: string, isRecent?: boolean }>}
 */
export async function checkOpenCorporates(rawCompanyName, ctx = {}) {
  const token =
    ctx?.token !== undefined
      ? ctx.token
      : process.env.OPENCORPORATES_API_TOKEN || env.OPENCORPORATES_API_TOKEN;

  if (!token) {
    return {
      name: PROVIDER_NAME,
      status: 'NOT_CHECKED',
      detail: 'No API token configured',
    };
  }

  const sanitized = sanitizeCompanyName(rawCompanyName);
  if (!sanitized) {
    return {
      name: PROVIDER_NAME,
      status: 'NOT_FOUND',
      detail: 'Invalid company name for registry query',
    };
  }

  const endpoint = `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(sanitized)}&jurisdiction_code=in&api_token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
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

    if (res.status === 401 || res.status === 403) {
      return {
        name: PROVIDER_NAME,
        status: 'UNAVAILABLE',
        detail: 'Registry authentication failure',
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
    const companies = json?.results?.companies || [];

    if (!Array.isArray(companies) || companies.length === 0) {
      return {
        name: PROVIDER_NAME,
        status: 'NOT_FOUND',
        detail: 'Company not found in Indian jurisdiction',
      };
    }

    const normTarget = normalizeName(sanitized);

    for (const wrapper of companies) {
      const comp = wrapper?.company;
      if (comp?.name) {
        const normComp = normalizeName(comp.name);
        if (normComp === normTarget || normComp.includes(normTarget) || normTarget.includes(normComp)) {
          const incDate = comp.incorporation_date;
          const isRecent = isYoungerThanTwelveMonths(incDate);
          const currentStatus = comp.current_status || 'Active';
          const recLabel = isRecent ? ' (Registered recently)' : '';
          const truncatedName = comp.name.length > 40 ? `${comp.name.slice(0, 37)}...` : comp.name;

          return {
            name: PROVIDER_NAME,
            status: 'FOUND',
            detail: `${currentStatus}${recLabel} (${truncatedName})`,
            isRecent,
          };
        }
      }
    }

    return {
      name: PROVIDER_NAME,
      status: 'NOT_FOUND',
      detail: 'Company not found in Indian jurisdiction',
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
