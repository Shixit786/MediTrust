/**
 * normalize.js - Sanitization and normalization utilities for company names.
 * Defense-in-depth: Rejects malicious injection payloads before external API calls.
 */

const SUFFIX_REGEX = /\b(?:pvt|private|ltd|limited|llp|inc|incorporated|corp|corporation|co|company|hospitals?|healthcare|health|technologies|technology|tech|systems?|services|solutions|group|trust|foundation|institutes?)\b/gi;

/**
 * Normalizes a company name for fuzzy/exact matching:
 * - Lowercase
 * - Strips punctuation
 * - Strips common corporate/entity suffixes
 * - Collapses whitespace
 * - Truncates to max 80 characters
 *
 * @param {string} name Candidate company name
 * @returns {string} Normalized company name
 */
export function normalizeName(name = '') {
  if (!name || typeof name !== 'string') return '';

  let cleaned = name.toLowerCase();

  // Strip punctuation to whitespace
  cleaned = cleaned.replace(/[^a-z0-9\s]/g, ' ');

  // Strip suffixes repeatedly
  cleaned = cleaned.replace(SUFFIX_REGEX, ' ');
  cleaned = cleaned.replace(SUFFIX_REGEX, ' ');

  // Collapse spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned.slice(0, 80).trim();
}

/**
 * Validates and sanitizes a company name candidate.
 * Strictly permits only letters, numbers, spaces, and safe punctuation (&, ., -).
 * Rejects path traversal, query params, SQL/HTML injection attempts.
 *
 * @param {string} name Candidate name
 * @returns {string|null} Sanitized name or null if rejected
 */
export function sanitizeCompanyName(name = '') {
  if (!name || typeof name !== 'string') return null;

  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 80) return null;

  // Only allow letters, digits, spaces, and &, ., -
  const validPattern = /^[a-zA-Z0-9\s&.\-]+$/;
  if (!validPattern.test(trimmed)) {
    return null;
  }

  // Reject suspicious traversal or command patterns
  if (trimmed.includes('..') || trimmed.includes('--')) {
    return null;
  }

  return trimmed;
}

/**
 * Extracts company name, preferring LLM output if available, else falling back to regex.
 *
 * @param {string} text Raw or extracted message text
 * @param {string|null} llmName Company name suggested by LLM
 * @returns {string|null} Extracted company name
 */
export function extractCompanyName(text = '', llmName = null) {
  if (llmName && typeof llmName === 'string') {
    const trimmed = llmName.trim();
    if (trimmed.length > 0 && trimmed.toLowerCase() !== 'null' && trimmed.toLowerCase() !== 'unknown') {
      return trimmed;
    }
  }

  if (!text || typeof text !== 'string') return null;

  // 1. Check preposition-led company name (prefer 'at', 'from', 'with', 'by')
  const prepMatch = /\b(?:at|from|with|by)\s+([A-Z][A-Za-z0-9&.,\s]{2,35}?(?:Pvt\.?\s*Ltd\.?|Limited|Hospitals?|Clinics?|Healthcare|Technologies|Tech|Systems?|Solutions|Infotech|Services|Group|Corporation|Inc|LLC|Trust|Foundation))\b/i.exec(
    text
  );
  if (prepMatch) {
    return prepMatch[1].trim();
  }

  // 2. Standalone company pattern matching
  const standaloneMatch = /\b([A-Z][A-Za-z0-9&.,\s]{2,35}?(?:Pvt\.?\s*Ltd\.?|Limited|Hospitals?|Clinics?|Healthcare|Technologies|Systems?|Solutions|Infotech|Services|Corporation))\b/.exec(
    text
  );
  if (standaloneMatch) {
    return standaloneMatch[1].trim();
  }

  return null;
}
