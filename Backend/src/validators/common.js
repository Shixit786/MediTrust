import { z } from 'zod';

/**
 * Zod schema for an Indian phone number:
 * - Accepts 10 digits starting with 6-9
 * - Supports optional '+91', '91', or leading '0' prefix
 * - Normalizes output to a clean 10-digit string
 */
export const indianPhoneSchema = z
  .string()
  .trim()
  .transform((val) => {
    // Strip non-digit characters except leading plus
    let cleaned = val.replace(/[\s\-().]/g, '');
    if (cleaned.startsWith('+91')) {
      cleaned = cleaned.slice(3);
    } else if (cleaned.startsWith('91') && cleaned.length === 12) {
      cleaned = cleaned.slice(2);
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = cleaned.slice(1);
    }
    return cleaned;
  })
  .refine((val) => /^[6-9]\d{9}$/.test(val), {
    message: 'Must be a valid 10-digit Indian phone number starting with 6, 7, 8, or 9',
  });

/**
 * Zod schema for numerical risk and confidence scores (0 to 100).
 */
export const scoreSchema = z.coerce
  .number()
  .int('Score must be an integer')
  .min(0, 'Score cannot be less than 0')
  .max(100, 'Score cannot exceed 100');
