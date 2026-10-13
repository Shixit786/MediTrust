/**
 * Sanitizes LLM replies to enforce strict safety boundaries.
 * - Strips links/URLs except cybercrime.gov.in
 * - Strips phone-like number patterns except 1930 and 112
 * - Strips HTML tags
 * - Collapses to at most 700 characters
 * - If the reply asks the user for sensitive credentials (OTP, PIN, password, card, Aadhaar), replaces with fallback
 */

export const FALLBACK_REPLY =
  'I am here to guide your digital safety. Remember the universal safety rules: 1) Never share OTPs, PINs, or passwords with anyone. 2) Always verify unexpected urgent claims directly through a trusted channel. 3) If money was lost or credentials compromised, contact your bank immediately, dial 1930, and report at cybercrime.gov.in.';

const SENSITIVE_ASK_PATTERNS = [
  /\b(?:tell|give|share|enter|provide|type|send|input|what is)\b[^.?!]*\b(?:otp|one[- ]time password|pin|upi pin|password|cvv|card number|credit card|debit card|aadhaar|pan number)\b/i,
  /\b(?:share your|give your|enter your|provide your|send your)\b[^.?!]*\b(?:otp|pin|password|card|cvv|aadhaar)\b/i,
];

export function sanitizeReply(text) {
  if (!text || typeof text !== 'string') {
    return FALLBACK_REPLY;
  }

  let clean = text.trim();

  // Check if reply asks the user for sensitive information
  for (const pattern of SENSITIVE_ASK_PATTERNS) {
    if (pattern.test(clean)) {
      return FALLBACK_REPLY;
    }
  }

  // 1. Strip HTML tags
  clean = clean.replace(/<[^>]*>/g, '');

  // 2. Normalize markdown links: [text](url)
  // If url or text is cybercrime.gov.in, keep cybercrime.gov.in, otherwise keep label text
  clean = clean.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
    if (url.includes('cybercrime.gov.in') || label.includes('cybercrime.gov.in')) {
      return 'cybercrime.gov.in';
    }
    return label;
  });

  // 3. Strip raw URLs except cybercrime.gov.in
  // Replace http://, https://, www.
  clean = clean.replace(/\b(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*/gi, (url) => {
    if (url.includes('cybercrime.gov.in')) {
      return 'cybercrime.gov.in';
    }
    return '';
  });

  // Also catch any stray URLs that don't start with http/www
  clean = clean.replace(/\b([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g, (match) => {
    if (match.toLowerCase().includes('cybercrime.gov.in')) {
      return 'cybercrime.gov.in';
    }
    // Don't strip normal English words with dots
    if (/\.(com|org|net|in|io|co|ai|xyz|ru|cn|cc|info)\b/i.test(match)) {
      return '';
    }
    return match;
  });

  // 4. Strip phone-number-like sequences except 1930 and 112
  // Match patterns like +91-XXXXX, 10-digit numbers, 7-digit numbers, formatted numbers
  clean = clean.replace(/(?:\+?91[\s-]?)?[6-9]\d{9}\b/g, '[phone]');
  clean = clean.replace(/\b\d{3,}[-\s]\d{3,}\b/g, (match) => {
    return match.replace(/\D/g, '') === '1930' ? '1930' : '[phone]';
  });
  clean = clean.replace(/\b\d{5,}\b/g, (match) => {
    return match === '1930' || match === '112' ? match : '[number]';
  });
  // Also clean up any isolated numbers that look like phone numbers (e.g., 8-12 digits)
  clean = clean.replace(/(?:\[phone\]|\[number\])/g, '');

  // 5. Clean up redundant spaces and whitespace
  clean = clean.replace(/[ \t]+/g, ' ');
  clean = clean.replace(/\n\s*\n\s*\n/g, '\n\n');
  clean = clean.trim();

  // 6. Enforce length cap (max 700 chars)
  if (clean.length > 700) {
    clean = clean.slice(0, 697).trim() + '...';
  }

  // Final check: if clean became empty, return fallback
  if (!clean || clean.length < 5) {
    return FALLBACK_REPLY;
  }

  return clean;
}
