/**
 * knownEmployers.js - Curated employer matching and look-alike detection.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { normalizeName } from './normalize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'knownEmployers.json');

let employersList = [];
try {
  const raw = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
  employersList = Array.isArray(raw) ? raw : raw.employers || [];
} catch {
  employersList = [];
}

/**
 * Computes Levenshtein distance between two strings.
 */
function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Matches candidate name against curated known employers.
 * Distinguishes verified exact matches from suspicious look-alikes.
 *
 * @param {string} name Candidate company name
 * @returns {{ match: object|null, exact: boolean, lookalike: boolean }}
 */
export function matchKnownEmployer(name) {
  const norm = normalizeName(name);
  if (!norm) {
    return { match: null, exact: false, lookalike: false };
  }

  // 1. Exact match check against name and aliases
  for (const emp of employersList) {
    if (normalizeName(emp.name) === norm) {
      return { match: emp, exact: true, lookalike: false };
    }
    if (Array.isArray(emp.aliases)) {
      for (const alias of emp.aliases) {
        if (normalizeName(alias) === norm) {
          return { match: emp, exact: true, lookalike: false };
        }
      }
    }
  }

  // 2. Look-alike detection via Levenshtein distance (1 or 2 edits)
  for (const emp of employersList) {
    const candidates = [emp.name, ...(emp.aliases || [])];
    for (const cand of candidates) {
      const normCand = normalizeName(cand);
      if (normCand.length >= 4 && norm.length >= 4) {
        const dist = levenshteinDistance(norm, normCand);
        if (dist >= 1 && dist <= 2 && Math.abs(norm.length - normCand.length) <= 2) {
          return { match: emp, exact: false, lookalike: true };
        }
      }
    }
  }

  return { match: null, exact: false, lookalike: false };
}
