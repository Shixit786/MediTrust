/**
 * domainConsistency.js - Evaluates consistency between claimed employer and
 * communication domains / URLs extracted from message text.
 */

import { extractUrls } from '../urlTools.js';
import { normalizeName } from './normalize.js';

const FREE_MAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'rediffmail.com',
  'proton.me',
  'protonmail.com',
  'ymail.com',
  'icloud.com',
  'zoho.com',
  'mail.com',
  'gmx.com',
]);

/**
 * Checks if a domain is a known public/free email provider.
 */
export function isFreeMailDomain(domain = '') {
  if (!domain) return false;
  const d = domain.toLowerCase().trim();
  return FREE_MAIL_DOMAINS.has(d);
}

/**
 * Extracts unique domain names and hostnames from email addresses and links in text.
 * Stores only domain strings in memory.
 *
 * @param {string} text Raw message text
 * @param {string[]} [extraUrls] Extra URLs (e.g. from PDF annotations)
 * @returns {string[]} Unique lowercase domain names
 */
export function extractContactDomains(text = '', extraUrls = []) {
  const domains = new Set();

  if (typeof text === 'string') {
    // 1. Email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi;
    let match;
    while ((match = emailRegex.exec(text)) !== null) {
      if (match[1]) {
        domains.add(match[1].toLowerCase().replace(/^www\./, ''));
      }
    }
  }

  // 2. URLs and hosts via urlTools
  const parsedUrls = extractUrls(text, extraUrls);
  for (const u of parsedUrls) {
    if (u.host) {
      domains.add(u.host.toLowerCase().replace(/^www\./, ''));
    }
  }

  return Array.from(domains);
}

/**
 * Verifies domain consistency against claimed employer.
 *
 * @param {object} params
 * @param {string} params.companyName Candidate company name
 * @param {object} params.knownMatch Result from matchKnownEmployer
 * @param {string[]} params.contactDomains Contact domains found in communication
 * @returns {{ status: 'MATCH'|'MISMATCH'|'NO_CONTACT'|'PLAUSIBLE'|'UNRELATED', hasFreeMail: boolean, detail: string }}
 */
export function evaluateDomainConsistency({ companyName, knownMatch, contactDomains = [] }) {
  if (!contactDomains || contactDomains.length === 0) {
    return {
      status: 'NO_CONTACT',
      hasFreeMail: false,
      detail: 'No contact domain found in communication',
    };
  }

  const hasFreeMail = contactDomains.some((d) => isFreeMailDomain(d));

  // Case 1: Known employer claimed
  if (knownMatch && knownMatch.match) {
    const officialDomains = knownMatch.match.officialDomains || [];

    // Free-mail contact claiming known employer is an immediate mismatch
    if (hasFreeMail) {
      return {
        status: 'MISMATCH',
        hasFreeMail: true,
        detail: 'Recruiter claims established employer but uses personal free-mail domain',
      };
    }

    // Check if every contact domain is in official domains or subdomains
    const allMatch = contactDomains.every((d) =>
      officialDomains.some((od) => d === od || d.endsWith(`.${od}`))
    );

    if (allMatch) {
      return {
        status: 'MATCH',
        hasFreeMail: false,
        detail: 'Contact infrastructure matches official employer domain',
      };
    }

    return {
      status: 'MISMATCH',
      hasFreeMail: false,
      detail: 'Contact domain does not match official employer infrastructure',
    };
  }

  // Case 2: Unknown employer
  const normName = normalizeName(companyName);
  const nameTokens = normName.split(' ').filter((t) => t.length >= 3);

  // Check if any non-freemail domain has alignment with name tokens
  const nonFreeDomains = contactDomains.filter((d) => !isFreeMailDomain(d));
  if (nonFreeDomains.length === 0 && hasFreeMail) {
    return {
      status: 'UNRELATED',
      hasFreeMail: true,
      detail: 'Sole contact channel is personal free-mail',
    };
  }

  let plausible = false;
  for (const d of nonFreeDomains) {
    const label = d.split('.')[0];
    if (nameTokens.some((tok) => label.includes(tok) || tok.includes(label))) {
      plausible = true;
      break;
    }
  }

  if (plausible) {
    return {
      status: 'PLAUSIBLE',
      hasFreeMail,
      detail: 'Domain label aligns with company name',
    };
  }

  return {
    status: 'UNRELATED',
    hasFreeMail,
    detail: 'Domain does not align with company name',
  };
}
