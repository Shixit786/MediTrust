/**
 * job-shield.test.js - Unit and integration tests for Job Shield rule engine,
 * URL heuristics, PDF parser, and scoring models. Uses node:test runner.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeText } from '../src/services/scamRules.js';
import { extractUrls, evaluateUrlHeuristics } from '../src/services/urlTools.js';
import { parsePdfBuffer } from '../src/services/pdf.service.js';
import {
  calculateJobRiskScore,
  determineThreatLabel,
  compileJobSignals,
} from '../src/services/jobResult.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAMPLES_DIR = path.join(__dirname, '..', 'scripts', 'job-samples');

function loadSample(filename) {
  return fs.readFileSync(path.join(SAMPLES_DIR, filename), 'utf-8').trim();
}

describe('Job Shield Rule Engine Fixture Tests', () => {
  test('Sample 1: Fake hospital job with fee, OTP and look-alike .xyz link (rulesScore >= 60)', () => {
    const text = loadSample('sample1_fake_hospital.txt');
    const result = analyzeText(text);

    assert.ok(result.rulesScore >= 60, `Expected score >= 60, got ${result.rulesScore}`);
    assert.ok(result.categories.includes('UPFRONT_PAYMENT'), 'Should include UPFRONT_PAYMENT');
    assert.ok(result.categories.includes('OTP_REQUEST'), 'Should include OTP_REQUEST');
  });

  test('Sample 2: Fake Gulf nursing placement with deposit and bit.ly link (rulesScore >= 60)', () => {
    const text = loadSample('sample2_gulf_nursing.txt');
    const result = analyzeText(text);

    assert.ok(result.rulesScore >= 60, `Expected score >= 60, got ${result.rulesScore}`);
    assert.ok(result.categories.includes('HEALTHCARE_JOB_LURE'), 'Should flag HEALTHCARE_JOB_LURE');
    assert.ok(result.categories.includes('UPFRONT_PAYMENT'), 'Should flag UPFRONT_PAYMENT');
  });

  test('Sample 3: Roman-Hinglish money-and-OTP scam (rulesScore >= 60)', () => {
    const text = loadSample('sample3_hinglish_scam.txt');
    const result = analyzeText(text);

    assert.ok(result.rulesScore >= 60, `Expected score >= 60, got ${result.rulesScore}`);
    assert.ok(result.categories.includes('OTP_REQUEST'), 'Should flag OTP_REQUEST');
    assert.ok(result.categories.includes('ISOLATION_SECRECY'), 'Should flag ISOLATION_SECRECY');
  });

  test('Sample 4: Hindi Devanagari urgency-and-payment scam (rulesScore >= 60)', () => {
    const text = loadSample('sample4_hindi_urgency.txt');
    const result = analyzeText(text);

    assert.ok(result.rulesScore >= 60, `Expected score >= 60, got ${result.rulesScore}`);
    assert.ok(result.categories.includes('URGENCY'), 'Should flag URGENCY');
    assert.ok(result.categories.includes('UPFRONT_PAYMENT'), 'Should flag UPFRONT_PAYMENT');
  });

  test('Sample 5: Medical emergency scam ("mama bimar hai, paise bhejo") (rulesScore >= 60, escalated)', () => {
    const text = loadSample('sample5_medical_emergency.txt');
    const result = analyzeText(text);

    assert.ok(result.rulesScore >= 60, `Expected score >= 60, got ${result.rulesScore}`);
    assert.equal(result.emergency_claim.detected, true, 'Emergency claim must be detected');
    assert.equal(result.emergency_claim.escalated, true, 'Emergency claim must be escalated');
    assert.ok(result.emergency_claim.relation !== null, 'Relation must be identified');
  });

  test('Sample 6: Genuine recruiter email (rulesScore < 30)', () => {
    const text = loadSample('sample6_genuine_recruiter.txt');
    const result = analyzeText(text);

    assert.ok(result.rulesScore < 30, `Expected genuine score < 30, got ${result.rulesScore}`);
  });

  test('Sample 7: Negated security policy message (rulesScore < 30)', () => {
    const text = loadSample('sample7_negated_policy.txt');
    const result = analyzeText(text);

    assert.ok(result.rulesScore < 30, `Expected negated score < 30, got ${result.rulesScore}`);
  });
});

describe('Highlights Offset Integrity & Deconfliction', () => {
  test('Highlight offsets are strictly valid, non-overlapping, and sorted', () => {
    const text = loadSample('sample1_fake_hospital.txt');
    const { highlights } = analyzeText(text);

    assert.ok(highlights.length > 0, 'Should produce highlights');

    for (let i = 0; i < highlights.length; i++) {
      const h = highlights[i];
      assert.ok(h.start >= 0, 'Highlight start >= 0');
      assert.ok(h.end <= text.length, 'Highlight end <= text.length');
      assert.ok(h.start < h.end, 'Highlight start < end');

      if (i > 0) {
        const prev = highlights[i - 1];
        assert.ok(
          prev.end <= h.start,
          `Overlap detected between [${prev.start}, ${prev.end}] and [${h.start}, ${h.end}]`
        );
      }
    }
  });
});

describe('URL Heuristics Engine', () => {
  test('bit.ly shortener is detected and flagged as suspicious', () => {
    const result = evaluateUrlHeuristics('https://bit.ly/gulf-nurse-apply', 'bit.ly');
    assert.ok(result.heuristic_score >= 25, `Expected score >= 25, got ${result.heuristic_score}`);
    assert.ok(result.reasons.some((r) => r.includes('shortener')));
  });

  test('.xyz hospital domain is detected and flagged', () => {
    const result = evaluateUrlHeuristics(
      'http://apollo-hospitals-recruit.xyz/verify',
      'apollo-hospitals-recruit.xyz'
    );
    assert.ok(result.heuristic_score >= 25, `Expected score >= 25, got ${result.heuristic_score}`);
    assert.ok(result.reasons.some((r) => r.includes('.xyz') || r.includes('keyword')));
  });

  test('Direct IP URL is flagged with high score', () => {
    const result = evaluateUrlHeuristics('http://192.168.1.100/login', '192.168.1.100');
    assert.ok(result.heuristic_score >= 60, `Expected score >= 60, got ${result.heuristic_score}`);
    assert.equal(result.verdict, 'flagged');
  });

  test('Punycode domain is flagged', () => {
    const result = evaluateUrlHeuristics('https://xn--pple-43d.com/jobs', 'xn--pple-43d.com');
    assert.ok(result.heuristic_score >= 60, `Expected score >= 60, got ${result.heuristic_score}`);
  });

  test('Official careers portal URL is clean', () => {
    const result = evaluateUrlHeuristics(
      'https://careers.tcs.com/jobs/interview-details',
      'careers.tcs.com'
    );
    assert.ok(result.heuristic_score < 25, `Expected score < 25, got ${result.heuristic_score}`);
    assert.equal(result.verdict, 'clean');
  });
});

describe('Regex Performance Safety', () => {
  test('5000-character adversarial string evaluates in under 100 ms (no ReDoS)', () => {
    // Construct adversarial string with deep repetitions and boundary words
    const adversarial = 'pay fee urgent '.repeat(350).slice(0, 5000);
    const start = performance.now();
    const result = analyzeText(adversarial);
    const elapsed = performance.now() - start;

    assert.ok(elapsed < 100, `Expected evaluation < 100 ms, took ${elapsed.toFixed(1)} ms`);
    assert.ok(typeof result.rulesScore === 'number');
  });
});

describe('PDF Parsing & Extraction', () => {
  test('Extracts text and link annotations from valid sample PDF', async () => {
    const pdfPath = path.join(SAMPLES_DIR, 'sample_job.pdf');
    assert.ok(fs.existsSync(pdfPath), 'sample_job.pdf fixture must exist');

    const buffer = fs.readFileSync(pdfPath);
    const result = await parsePdfBuffer(buffer);

    assert.ok(result.text.length > 20, 'Extracted text should exceed 20 characters');
    assert.ok(result.links.length > 0, 'Extracted links should include annotation');
    assert.equal(result.meta.pages, 1);
    assert.equal(result.meta.truncated, false);
  });
});

// Import threat intelligence tests
import './intel.test.js';

// Import company verification tests
import './company.test.js';

// Import SIM Guard tests
import './sim.test.js';

// Import Fusion Engine tests
import './fusion.test.js';
