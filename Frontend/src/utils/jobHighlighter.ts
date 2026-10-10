export interface HighlightMatch {
  text: string;
  category: 'UPFRONT PAYMENT' | 'OTP REQUEST' | 'URGENCY' | 'UNREALISTIC SALARY' | 'SUSPICIOUS LINK' | 'PERSONAL DATA';
  reason: string;
  start: number;
  end: number;
}

export interface HighlightRule {
  pattern: RegExp;
  category: 'UPFRONT PAYMENT' | 'OTP REQUEST' | 'URGENCY' | 'UNREALISTIC SALARY' | 'SUSPICIOUS LINK' | 'PERSONAL DATA';
  reason: string;
}

export const HIGHLIGHT_RULES: HighlightRule[] = [
  {
    pattern: /refundable registration fee( of Rs \d+([,.]\d+)?)?/i,
    category: 'UPFRONT PAYMENT',
    reason: 'Advance fee demand: Legitimate hospitals never charge candidates to hire.',
  },
  {
    pattern: /medical clearance deposit( of Rs \d+([,.]\d+)?)?/i,
    category: 'UPFRONT PAYMENT',
    reason: 'Fake deposit scheme: Demanding payment for visa/clearance is a classic fraud pattern.',
  },
  {
    pattern: /registration fee|security deposit|refundable fee/i,
    category: 'UPFRONT PAYMENT',
    reason: 'Employers never require application or registration fees.',
  },
  {
    pattern: /via UPI|pay via UPI|UPI\/IMPS/i,
    category: 'UPFRONT PAYMENT',
    reason: 'Unregulated payment channel: UPI requests are irreversible.',
  },
  {
    pattern: /transaction OTP|share OTP|verification OTP|\bOTP\b/i,
    category: 'OTP REQUEST',
    reason: 'Direct credential harvesting: OTPs allow immediate account takeover.',
  },
  {
    pattern: /reply within 2 hours|within 2 hours|limited seats available|immediate joining|offer expires today|delay beyond 24 hours/i,
    category: 'URGENCY',
    reason: 'High-pressure urgency: Scammers force haste to prevent fact-checking.',
  },
  {
    pattern: /Rs 85,000\/month|Rs 3,25,000\/month|AED 14,500/i,
    category: 'UNREALISTIC SALARY',
    reason: 'Inflated salary benchmark: Unusually high pay used as clickbait lure.',
  },
  {
    pattern: /100% Work from home|Work from home/i,
    category: 'UNREALISTIC SALARY',
    reason: 'High-salary remote clinical offers are frequently fraudulent.',
  },
  {
    pattern: /http:\/\/[^\s]+/i,
    category: 'SUSPICIOUS LINK',
    reason: 'Insecure unencrypted link or suspicious look-alike domain.',
  },
  {
    pattern: /https?:\/\/(?:[a-zA-Z0-9-]+\.)*?(?:xyz|top|link|online|bit\.ly|tinyurl)[^\s]*/i,
    category: 'SUSPICIOUS LINK',
    reason: 'Suspicious TLD or shortened link used to conceal target portal.',
  },
  {
    pattern: /Aadhaar Card|Passport and Bank Details|Bank Details|\bAadhaar\b/i,
    category: 'PERSONAL DATA',
    reason: 'Identity theft risk: Demanding sensitive KYC documents over unencrypted chat.',
  },
];

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'UPFRONT PAYMENT': { bg: 'rgba(249, 115, 22, 0.15)', text: '#EA580C', border: '#EA580C' },
  'OTP REQUEST': { bg: 'rgba(225, 29, 46, 0.15)', text: '#E11D2E', border: '#E11D2E' },
  'URGENCY': { bg: 'rgba(245, 184, 0, 0.18)', text: '#B45309', border: '#F5B800' },
  'UNREALISTIC SALARY': { bg: 'rgba(59, 91, 255, 0.12)', text: '#3B5BFF', border: '#3B5BFF' },
  'SUSPICIOUS LINK': { bg: 'rgba(225, 29, 46, 0.15)', text: '#E11D2E', border: '#E11D2E' },
  'PERSONAL DATA': { bg: 'rgba(217, 70, 239, 0.15)', text: '#C026D3', border: '#D946EF' },
};

export interface HighlightSegment {
  text: string;
  isHighlight: boolean;
  category?: 'UPFRONT PAYMENT' | 'OTP REQUEST' | 'URGENCY' | 'UNREALISTIC SALARY' | 'SUSPICIOUS LINK' | 'PERSONAL DATA';
  reason?: string;
}

export function parseHighlightedText(text: string): HighlightSegment[] {
  if (!text) return [];

  // Find all matches with their start/end indices
  const matches: HighlightMatch[] = [];

  for (const rule of HIGHLIGHT_RULES) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags + (rule.pattern.global ? '' : 'g'));
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        text: match[0],
        category: rule.category,
        reason: rule.reason,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);

  // De-duplicate / remove overlapping matches (prefer longer/earlier matches)
  const nonOverlapping: HighlightMatch[] = [];
  let lastEnd = 0;

  for (const m of matches) {
    if (m.start >= lastEnd) {
      nonOverlapping.push(m);
      lastEnd = m.end;
    }
  }

  // Build segmented stream
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const m of nonOverlapping) {
    if (m.start > cursor) {
      segments.push({
        text: text.slice(cursor, m.start),
        isHighlight: false,
      });
    }
    segments.push({
      text: text.slice(m.start, m.end),
      isHighlight: true,
      category: m.category,
      reason: m.reason,
    });
    cursor = m.end;
  }

  if (cursor < text.length) {
    segments.push({
      text: text.slice(cursor),
      isHighlight: false,
    });
  }

  return segments;
}
