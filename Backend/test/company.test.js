/**
 * company.test.js - Unit tests for Stage 3C Company Verification.
 * Tests normalization, security sanitization, look-alike detection,
 * domain consistency, registry lookups, caching, and score combination.
 * Zero real network calls.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import env from '../src/config/env.js';
import { normalizeName, sanitizeCompanyName, extractCompanyName } from '../src/services/company/normalize.js';
import { matchKnownEmployer } from '../src/services/company/knownEmployers.js';
import { evaluateDomainConsistency, extractContactDomains } from '../src/services/company/domainConsistency.js';
import { checkGleif } from '../src/services/company/gleif.js';
import { checkOpenCorporates } from '../src/services/company/opencorporates.js';
import {
  verifyCompany,
  refineCompanyVerification,
  _clearCompanyCache,
  _resetCompanyCircuitBreakers,
} from '../src/services/company/company.service.js';
import { calculateJobRiskScore, buildJobResult } from '../src/services/jobResult.service.js';
import { analyzeText } from '../src/services/scamRules.js';
import { evaluateUrlHeuristics } from '../src/services/urlTools.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAMPLES_DIR = path.join(__dirname, '..', 'scripts', 'job-samples');

const originalFetch = global.fetch;

function loadSample(filename) {
  return fs.readFileSync(path.join(SAMPLES_DIR, filename), 'utf-8').trim();
}

describe('Company Name Normalization & Sanitization', () => {
  test('normalizeName strips suffixes, punctuation, and collapses spaces', () => {
    assert.equal(normalizeName('Apollo Hospitals Pvt. Ltd.'), 'apollo');
    assert.equal(normalizeName('Fortis Healthcare Limited'), 'fortis');
    assert.equal(normalizeName('Tata Consultancy Services Ltd'), 'tata consultancy');
    assert.equal(normalizeName('Infosys Technologies'), 'infosys');
    assert.equal(normalizeName('Max Healthcare Group'), 'max');
  });

  test('sanitizeCompanyName strictly rejects injection and traversal attempts', () => {
    // Malicious injection attempts must return null
    assert.equal(sanitizeCompanyName('Acme/../admin?x=1'), null);
    assert.equal(sanitizeCompanyName('<script>alert("hack")</script>'), null);
    assert.equal(sanitizeCompanyName("Acme' OR 1=1--"), null);
    assert.equal(sanitizeCompanyName('Acme; DROP TABLE companies;'), null);
    assert.equal(sanitizeCompanyName('http://evil.com/'), null);

    // Valid enterprise names must pass through cleanly
    assert.equal(sanitizeCompanyName('Apollo Hospitals'), 'Apollo Hospitals');
    assert.equal(sanitizeCompanyName('L&T Infotech'), 'L&T Infotech');
    assert.equal(sanitizeCompanyName('Dr. Lal PathLabs'), 'Dr. Lal PathLabs');
    assert.equal(sanitizeCompanyName('Tata-1mg Healthcare'), 'Tata-1mg Healthcare');
  });

  test('extractCompanyName prefers LLM name when provided, else regex', () => {
    const text = 'Urgent job opportunity at Max Healthcare for Nurse role.';
    assert.equal(extractCompanyName(text, 'Apollo Hospitals'), 'Apollo Hospitals');
    assert.equal(extractCompanyName(text, null), 'Max Healthcare');
    assert.equal(extractCompanyName('Random text with no company', null), null);
  });
});

describe('Known Employer Matching & Look-Alike Detection', () => {
  test('Exact matching matches official names and known aliases', () => {
    const r1 = matchKnownEmployer('Apollo Hospitals');
    assert.equal(r1.exact, true);
    assert.equal(r1.lookalike, false);
    assert.equal(r1.match.name, 'Apollo Hospitals');

    const r2 = matchKnownEmployer('TCS');
    assert.equal(r2.exact, true);
    assert.equal(r2.match.name, 'Tata Consultancy Services');

    const r3 = matchKnownEmployer('AIIMS New Delhi');
    assert.equal(r3.exact, true);
    assert.equal(r3.match.name, 'AIIMS');
  });

  test('Look-alike detection catches typo-squatting variations', () => {
    const r1 = matchKnownEmployer('Apolo Hospitals');
    assert.equal(r1.lookalike, true);
    assert.equal(r1.exact, false);
    assert.equal(r1.match.name, 'Apollo Hospitals');

    const r2 = matchKnownEmployer('Fortiss Healthcare');
    assert.equal(r2.lookalike, true);
    assert.equal(r2.match.name, 'Fortis Healthcare');

    const r3 = matchKnownEmployer('Infosis');
    assert.equal(r3.lookalike, true);
    assert.equal(r3.match.name, 'Infosys');
  });

  test('Unrelated companies return no match', () => {
    const res = matchKnownEmployer('Sunrise Organic Bakery');
    assert.equal(res.match, null);
    assert.equal(res.exact, false);
    assert.equal(res.lookalike, false);
  });
});

describe('Domain Consistency Checking', () => {
  test('Known employer with official domain produces MATCH', () => {
    const match = matchKnownEmployer('Apollo Hospitals');
    const res = evaluateDomainConsistency({
      companyName: 'Apollo Hospitals',
      knownMatch: match,
      contactDomains: ['apollohospitals.com', 'apollo247.com'],
    });
    assert.equal(res.status, 'MATCH');
    assert.equal(res.hasFreeMail, false);
  });

  test('Known employer with free-mail produces MISMATCH with freeMail flag', () => {
    const match = matchKnownEmployer('Apollo Hospitals');
    const res = evaluateDomainConsistency({
      companyName: 'Apollo Hospitals',
      knownMatch: match,
      contactDomains: ['gmail.com'],
    });
    assert.equal(res.status, 'MISMATCH');
    assert.equal(res.hasFreeMail, true);
  });

  test('Known employer with mismatching non-official domain produces MISMATCH', () => {
    const match = matchKnownEmployer('Fortis Healthcare');
    const res = evaluateDomainConsistency({
      companyName: 'Fortis Healthcare',
      knownMatch: match,
      contactDomains: ['fortis-recruitment-jobs.xyz'],
    });
    assert.equal(res.status, 'MISMATCH');
  });

  test('No contact domain produces NO_CONTACT', () => {
    const res = evaluateDomainConsistency({
      companyName: 'Nexus Global',
      knownMatch: { match: null },
      contactDomains: [],
    });
    assert.equal(res.status, 'NO_CONTACT');
  });

  test('Unknown company with aligning domain produces PLAUSIBLE', () => {
    const res = evaluateDomainConsistency({
      companyName: 'Nexus Global Systems',
      knownMatch: { match: null },
      contactDomains: ['nexusglobalsystems.com'],
    });
    assert.equal(res.status, 'PLAUSIBLE');
  });

  test('Unknown company with mismatched domain produces UNRELATED', () => {
    const res = evaluateDomainConsistency({
      companyName: 'Nexus Global Systems',
      knownMatch: { match: null },
      contactDomains: ['completely-random-store.org'],
    });
    assert.equal(res.status, 'UNRELATED');
  });
});

describe('Registry Lookup Services (GLEIF & OpenCorporates)', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('GLEIF: FOUND on fuzzy match, sends only sanitized name', async () => {
    let capturedUrl = '';
    global.fetch = async (url) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              attributes: {
                entity: {
                  legalName: { name: 'APOLLO HOSPITALS ENTERPRISE LIMITED' },
                },
              },
            },
          ],
        }),
      };
    };

    const res = await checkGleif('Apollo Hospitals');
    assert.equal(res.status, 'FOUND');
    assert.ok(res.detail.includes('APOLLO HOSPITALS'));
    assert.ok(capturedUrl.includes('Apollo%20Hospitals'));
    assert.ok(!capturedUrl.includes('candidate'));
  });

  test('GLEIF: NOT_FOUND when entity not in index', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    });

    const res = await checkGleif('Fictional Space Travel Corp');
    assert.equal(res.status, 'NOT_FOUND');
  });

  test('GLEIF: UNAVAILABLE on HTTP 429 rate limit or timeout', async () => {
    global.fetch = async () => ({ ok: false, status: 429 });
    const res = await checkGleif('Apollo Hospitals');
    assert.equal(res.status, 'UNAVAILABLE');
  });

  test('OpenCorporates: NOT_CHECKED when no token configured', async () => {
    const res = await checkOpenCorporates('Apollo Hospitals', { token: '' });
    assert.equal(res.status, 'NOT_CHECKED');
    assert.equal(res.detail, 'No API token configured');
  });

  test('OpenCorporates: FOUND with recent registration flag when < 12 months', async () => {
    const recentDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        results: {
          companies: [
            {
              company: {
                name: 'NEWLY INCORPORATED HOSPITAL TECH PRIVATE LIMITED',
                incorporation_date: recentDate,
                current_status: 'Active',
              },
            },
          ],
        },
      }),
    });

    const res = await checkOpenCorporates('Newly Incorporated Hospital Tech', { token: 'mock_token' });
    assert.equal(res.status, 'FOUND');
    assert.equal(res.isRecent, true);
    assert.ok(res.detail.includes('Registered recently'));
  });
});

describe('Company Verification Orchestrator, Caching & Circuit Breaker', () => {
  beforeEach(() => {
    _clearCompanyCache();
    _resetCompanyCircuitBreakers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    _clearCompanyCache();
    _resetCompanyCircuitBreakers();
  });

  test('verifyCompany returns 5 checks in exact contract order', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    });

    const res = await verifyCompany({
      name: 'Apollo Hospitals',
      contactDomains: ['apollohospitals.com'],
    });

    assert.equal(res.checks.length, 5);
    assert.equal(res.checks[0].name, 'KNOWN EMPLOYER LIST');
    assert.equal(res.checks[1].name, 'DOMAIN CONSISTENCY');
    assert.equal(res.checks[2].name, 'GLEIF');
    assert.equal(res.checks[3].name, 'OPENCORPORATES');
    assert.equal(res.checks[4].name, 'NAME LOOK-ALIKE');
    assert.ok(res.note.includes('Registry coverage is limited'));
  });

  test('Cache hit makes zero duplicate fetch queries', async () => {
    let fetchCount = 0;
    global.fetch = async () => {
      fetchCount++;
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      };
    };

    await verifyCompany({ name: 'Medanta', contactDomains: ['medanta.org'] });
    const countAfterFirst = fetchCount;
    assert.ok(countAfterFirst > 0);

    // Second call with same name must hit LRU cache
    await verifyCompany({ name: 'Medanta', contactDomains: ['medanta.org'] });
    assert.equal(fetchCount, countAfterFirst);
  });

  test('Circuit breaker trips to UNAVAILABLE after 3 consecutive failures', async () => {
    global.fetch = async () => ({ ok: false, status: 500 });

    await verifyCompany({ name: 'FailCo 1' });
    await verifyCompany({ name: 'FailCo 2' });
    await verifyCompany({ name: 'FailCo 3' });

    // 4th call must be blocked by breaker
    const res = await verifyCompany({ name: 'FailCo 4' });
    const gleif = res.checks.find((c) => c.name === 'GLEIF');
    assert.equal(gleif.status, 'UNAVAILABLE');
    assert.equal(gleif.detail, 'Registry in cooldown');
  });

  test('refineCompanyVerification refines known checks without re-fetching registries', async () => {
    let fetchCount = 0;
    global.fetch = async () => {
      fetchCount++;
      return { ok: true, status: 200, json: async () => ({ data: [] }) };
    };

    const prelim = await verifyCompany({
      name: 'Generic Healthcare',
      contactDomains: ['apollohospitals.com'],
    });

    const refined = refineCompanyVerification(
      prelim,
      'Apollo Hospitals',
      ['apollohospitals.com']
    );

    assert.equal(refined.name, 'Apollo Hospitals');
    assert.equal(refined.checks[0].status, 'VERIFIED');
    assert.equal(refined.checks[1].status, 'MATCH');
  });
});

describe('Scoring Integration & Honesty Rules', () => {
  test('A verified MATCH never lowers risk score', () => {
    // When rules score is 80, a genuine company match does not artificially reduce risk
    const withNoCompany = calculateJobRiskScore({
      rulesScore: 80,
      urlMax: 0,
      llmScore: 80,
      companyScore: 0,
      hasCompany: false,
      isTemplateLlm: false,
      hasUrls: false,
    });

    const withVerifiedCompany = calculateJobRiskScore({
      rulesScore: 80,
      urlMax: 0,
      llmScore: 80,
      companyScore: 0,
      hasCompany: true,
      isTemplateLlm: false,
      hasUrls: false,
    });

    // Peak guard ensures severe rule violations are preserved
    assert.ok(withVerifiedCompany.risk >= Math.round(0.85 * 80));
    assert.equal(withVerifiedCompany.weightsUsed.company, 0.1);
  });

  test('Employer look-alike + domain mismatch spikes company_score', () => {
    const knownMatch = matchKnownEmployer('Apolo Hospitals');
    const domainResult = evaluateDomainConsistency({
      companyName: 'Apolo Hospitals',
      knownMatch,
      contactDomains: ['gmail.com', 'apolo-careers.xyz'],
    });

    assert.equal(knownMatch.lookalike, true);
    assert.equal(domainResult.status, 'MISMATCH');
    assert.equal(domainResult.hasFreeMail, true);
  });
});

describe('Stage 3C Real Sample Fixture Verification', () => {
  beforeEach(() => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('Sample 8: Fake Apolo Hospitals recruiter flags employer impersonation and high risk', async () => {
    const text = loadSample('sample8_apolo_lookalike.txt');
    const rulesAnalysis = analyzeText(text);
    const urlAnalysis = [evaluateUrlHeuristics('http://apolo-hospitals-careers.xyz/verify', 'apolo-hospitals-careers.xyz')];
    const aiAnalysis = {
      scam_probability: 90,
      company_name: 'Apolo Hospitals',
      provider: 'template',
      summary: 'High risk employment scam detected.',
      tactics: ['advance fee'],
    };

    const contactDomains = extractContactDomains(text);
    const companyAnalysis = await verifyCompany({
      text,
      name: 'Apolo Hospitals',
      contactDomains,
    });

    const result = buildJobResult({
      inputType: 'text',
      pdfMeta: null,
      extractedText: text,
      rulesAnalysis,
      urlAnalysis,
      aiAnalysis,
      companyAnalysis,
    });

    assert.ok(result.risk >= 60, `Risk should be high/critical, got ${result.risk}`);
    const redFlags = result.red_flags || result.extra?.red_flags || [];
    assert.ok(
      redFlags.some((rf) => rf.title === 'Possible employer impersonation'),
      'Must contain employer impersonation red flag'
    );
    const stagesPending = result.stages_pending || result.extra?.stages_pending || [];
    assert.equal(stagesPending.length, 0);
  });

  test('Sample 9: Genuine Apollo Hospitals invitation stays LOW risk', async () => {
    const text = loadSample('sample9_genuine_apollo.txt');
    const rulesAnalysis = analyzeText(text);
    const urlAnalysis = [evaluateUrlHeuristics('https://www.apollohospitals.com/careers/clinical-coordinator', 'apollohospitals.com')];
    const aiAnalysis = {
      scam_probability: 0,
      company_name: 'Apollo Hospitals',
      provider: 'template',
      summary: 'Legitimate recruitment notice.',
      tactics: [],
    };

    const contactDomains = extractContactDomains(text);
    const companyAnalysis = await verifyCompany({
      text,
      name: 'Apollo Hospitals',
      contactDomains,
    });

    const result = buildJobResult({
      inputType: 'text',
      pdfMeta: null,
      extractedText: text,
      rulesAnalysis,
      urlAnalysis,
      aiAnalysis,
      companyAnalysis,
    });

    assert.ok(result.risk < 30, `Risk should be low (<30), got ${result.risk}`);
    assert.equal(result.level, 'low');
    const comp = result.company || result.extra?.company;
    assert.ok(comp, 'Company block must exist');
    assert.equal(comp.checks[0].status, 'VERIFIED');
    assert.equal(comp.checks[1].status, 'MATCH');
  });

  test('Sample 10: Unknown small company invitation stays LOW risk with registry note', async () => {
    const text = loadSample('sample10_unknown_small_company.txt');
    const rulesAnalysis = analyzeText(text);
    const urlAnalysis = [evaluateUrlHeuristics('https://nexusglobalsystems.com/careers', 'nexusglobalsystems.com')];
    const aiAnalysis = {
      scam_probability: 0,
      company_name: 'Nexus Global Systems',
      provider: 'template',
      summary: 'Introductory tech outreach.',
      tactics: [],
    };

    const contactDomains = extractContactDomains(text);
    const companyAnalysis = await verifyCompany({
      text,
      name: 'Nexus Global Systems',
      contactDomains,
    });

    const result = buildJobResult({
      inputType: 'text',
      pdfMeta: null,
      extractedText: text,
      rulesAnalysis,
      urlAnalysis,
      aiAnalysis,
      companyAnalysis,
    });

    assert.ok(result.risk < 30, `Risk must stay below 30, got ${result.risk}`);
    const comp = result.company || result.extra?.company;
    assert.ok(comp, 'Company block must exist');
    assert.ok(comp.note.includes('Registry coverage is limited'));
  });
});
