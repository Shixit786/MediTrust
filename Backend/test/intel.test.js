/**
 * intel.test.js - Unit tests for threat intelligence providers, orchestrator,
 * URL sanitization, SSRF guards, LRU caching, and verdict combination.
 * NO real network calls. NO real API keys.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import dns from 'node:dns/promises';

import { stripUrl, extractHost, getRegistrableDomain, isPrivateOrReservedIp, isAllowlistedHost } from '../src/services/intel/urlHelpers.js';
import { check as checkGsb } from '../src/services/intel/googleSafeBrowsing.js';
import { check as checkVt, _resetRateGuard } from '../src/services/intel/virustotal.js';
import { check as checkUrlhaus } from '../src/services/intel/urlhaus.js';
import { check as checkAbuseIpDb } from '../src/services/intel/abuseipdb.js';
import { check as checkSecurityTrails } from '../src/services/intel/securitytrails.js';
import { enrichUrls, getIntelStatus, _clearCache, _resetCircuitBreakers } from '../src/services/intel/intel.service.js';
import { combineUrlVerdict } from '../src/services/urlTools.js';

// Preserve original globals
const originalFetch = global.fetch;
const originalDnsLookup = dns.lookup;

describe('URL Privacy Sanitization & Domain Helpers', () => {
  test('stripUrl removes query parameters, fragments, and credentials', () => {
    const raw = 'https://admin:secret123@sub.example.com:8080/path/to/apply?token=xyz123&track=456#heading-1';
    const cleaned = stripUrl(raw);

    assert.equal(cleaned, 'https://sub.example.com:8080/path/to/apply');
    assert.ok(!cleaned.includes('admin'));
    assert.ok(!cleaned.includes('secret123'));
    assert.ok(!cleaned.includes('token'));
    assert.ok(!cleaned.includes('heading-1'));
  });

  test('extractHost normalizes hostnames correctly', () => {
    assert.equal(extractHost('https://WWW.Example.COM/test'), 'www.example.com');
  });

  test('getRegistrableDomain extracts root domain and handles multi-part TLDs', () => {
    assert.equal(getRegistrableDomain('sub.example.com'), 'example.com');
    assert.equal(getRegistrableDomain('portal.recruitment.gov.in'), 'recruitment.gov.in');
    assert.equal(getRegistrableDomain('192.168.1.1'), null);
  });

  test('isAllowlistedHost correctly identifies trusted domains', () => {
    assert.equal(isAllowlistedHost('google.com'), true);
    assert.equal(isAllowlistedHost('www.google.com'), true);
    assert.equal(isAllowlistedHost('in.linkedin.com'), true);
    assert.equal(isAllowlistedHost('naukri.com'), true);
    assert.equal(isAllowlistedHost('recruitment.gov.in'), true);
    assert.equal(isAllowlistedHost('evil-google.com'), false);
    assert.equal(isAllowlistedHost('phishing.xyz'), false);
  });
});

describe('SSRF & Private IP Guards', () => {
  test('Detects IPv4 private, loopback, and link-local ranges', () => {
    assert.equal(isPrivateOrReservedIp('127.0.0.1'), true);
    assert.equal(isPrivateOrReservedIp('10.0.0.5'), true);
    assert.equal(isPrivateOrReservedIp('172.16.0.1'), true);
    assert.equal(isPrivateOrReservedIp('192.168.1.1'), true);
    assert.equal(isPrivateOrReservedIp('169.254.1.1'), true);
    assert.equal(isPrivateOrReservedIp('0.0.0.0'), true);
    assert.equal(isPrivateOrReservedIp('8.8.8.8'), false);
    assert.equal(isPrivateOrReservedIp('1.1.1.1'), false);
  });

  test('Detects IPv6 loopback, link-local, and unique local addresses', () => {
    assert.equal(isPrivateOrReservedIp('::1'), true);
    assert.equal(isPrivateOrReservedIp('fe80::1'), true);
    assert.equal(isPrivateOrReservedIp('fc00::1'), true);
    assert.equal(isPrivateOrReservedIp('2606:4700:4700::1111'), false);
  });
});

describe('Google Safe Browsing Provider Tests', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('Missing API key returns NOT_CHECKED', async () => {
    const res = await checkGsb({ url: 'https://example.com' }, { apiKey: '' });
    assert.equal(res.status, 'NOT_CHECKED');
    assert.equal(res.name, 'GOOGLE SAFE BROWSING');
  });

  test('Matches found returns FLAGGED with stripped URL in body', async () => {
    let recordedBody = null;
    global.fetch = async (_url, opts) => {
      recordedBody = JSON.parse(opts.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          matches: [{ threatType: 'SOCIAL_ENGINEERING' }],
        }),
      };
    };

    const res = await checkGsb(
      { url: 'https://malicious.com/phish?token=secret#frag' },
      { apiKey: 'mock_gsb_key' }
    );
    assert.equal(res.status, 'FLAGGED');
    assert.ok(res.detail.includes('phishing'));
    assert.equal(recordedBody.threatInfo.threatEntries[0].url, 'https://malicious.com/phish');
  });

  test('No matches returns CLEAN', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    const res = await checkGsb({ url: 'https://safe.com' }, { apiKey: 'mock_gsb_key' });
    assert.equal(res.status, 'CLEAN');
  });

  test('HTTP 429 returns UNAVAILABLE', async () => {
    global.fetch = async () => ({ ok: false, status: 429 });

    const res = await checkGsb({ url: 'https://example.com' }, { apiKey: 'mock_gsb_key' });
    assert.equal(res.status, 'UNAVAILABLE');
  });

  test('Malformed JSON returns UNAVAILABLE without throwing', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    });

    const res = await checkGsb({ url: 'https://example.com' }, { apiKey: 'mock_gsb_key' });
    assert.equal(res.status, 'UNAVAILABLE');
  });
});

describe('VirusTotal Provider Tests', () => {
  beforeEach(() => {
    _resetRateGuard();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    _resetRateGuard();
  });

  test('Missing key returns NOT_CHECKED', async () => {
    const res = await checkVt({ url: 'https://example.com' }, { apiKey: '' });
    assert.equal(res.status, 'NOT_CHECKED');
  });

  test('HTTP 404 returns NOT_CHECKED with "URL not seen by VirusTotal yet"', async () => {
    global.fetch = async () => ({ ok: false, status: 404 });

    const res = await checkVt({ url: 'https://brand-new-domain.com' }, { apiKey: 'mock_vt_key' });
    assert.equal(res.status, 'NOT_CHECKED');
    assert.ok(res.detail.includes('not seen'));
  });

  test('Malicious engines >= 3 returns FLAGGED', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: { attributes: { last_analysis_stats: { malicious: 4, suspicious: 1 } } },
      }),
    });

    const res = await checkVt({ url: 'https://evil.com' }, { apiKey: 'mock_vt_key' });
    assert.equal(res.status, 'FLAGGED');
  });

  test('Malicious 1-2 or suspicious >= 2 returns SUSPICIOUS', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: { attributes: { last_analysis_stats: { malicious: 1, suspicious: 0 } } },
      }),
    });

    const res = await checkVt({ url: 'https://suspicious.com' }, { apiKey: 'mock_vt_key' });
    assert.equal(res.status, 'SUSPICIOUS');
  });

  test('Local rate guard enforces 4 req/min limit', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: { attributes: { last_analysis_stats: { malicious: 0, suspicious: 0 } } },
      }),
    });

    // 4 successful calls
    for (let i = 0; i < 4; i++) {
      const res = await checkVt({ url: `https://test${i}.com` }, { apiKey: 'mock_vt_key' });
      assert.equal(res.status, 'CLEAN');
    }

    // 5th call should be blocked by rate guard
    const res5 = await checkVt({ url: 'https://test5.com' }, { apiKey: 'mock_vt_key' });
    assert.equal(res5.status, 'UNAVAILABLE');
    assert.equal(res5.detail, 'Quota guard');
  });
});

describe('URLhaus Provider Tests', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('Missing key returns NOT_CHECKED', async () => {
    const res = await checkUrlhaus({ url: 'https://example.com' }, { apiKey: '' });
    assert.equal(res.status, 'NOT_CHECKED');
  });

  test('query_status "ok" returns FLAGGED', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ query_status: 'ok', threat: 'malware_download' }),
    });

    const res = await checkUrlhaus({ url: 'https://malware.org/payload.exe' }, { apiKey: 'mock_urlhaus_key' });
    assert.equal(res.status, 'FLAGGED');
    assert.ok(res.detail.includes('URLhaus'));
  });

  test('query_status "no_results" returns CLEAN', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ query_status: 'no_results' }),
    });

    const res = await checkUrlhaus({ url: 'https://safe-domain.org' }, { apiKey: 'mock_urlhaus_key' });
    assert.equal(res.status, 'CLEAN');
  });
});

describe('AbuseIPDB Provider Tests & SSRF Protection', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    dns.lookup = originalDnsLookup;
  });

  test('Private IP hosts are NEVER sent to AbuseIPDB', async () => {
    let fetchCalled = false;
    global.fetch = async () => {
      fetchCalled = true;
      return { ok: true, status: 200, json: async () => ({}) };
    };

    const res = await checkAbuseIpDb({ url: 'http://127.0.0.1/admin', host: '127.0.0.1' }, { apiKey: 'mock_abuse_key' });
    assert.equal(res.status, 'NOT_CHECKED');
    assert.equal(res.detail, 'Private or local address');
    assert.equal(fetchCalled, false, 'Fetch must never be called for loopback address');

    const res2 = await checkAbuseIpDb({ url: 'http://localhost:5000', host: 'localhost' }, { apiKey: 'mock_abuse_key' });
    assert.equal(res2.status, 'NOT_CHECKED');
    assert.equal(fetchCalled, false, 'Fetch must never be called for localhost');
  });

  test('Public IP returns FLAGGED when abuseConfidenceScore >= 75', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: { abuseConfidenceScore: 88 },
      }),
    });

    const res = await checkAbuseIpDb({ url: 'http://203.0.113.5', host: '93.184.216.34' }, { apiKey: 'mock_abuse_key' });
    assert.equal(res.status, 'FLAGGED');
    assert.ok(res.detail.includes('88%'));
  });

  test('Public IP returns SUSPICIOUS when abuseConfidenceScore is between 25 and 74', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: { abuseConfidenceScore: 45 },
      }),
    });

    const res = await checkAbuseIpDb({ host: '93.184.216.34' }, { apiKey: 'mock_abuse_key' });
    assert.equal(res.status, 'SUSPICIOUS');
  });
});

describe('SecurityTrails Provider Tests', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('IP hosts skip domain check with NOT_CHECKED', async () => {
    const res = await checkSecurityTrails({ host: '192.168.1.1' }, { apiKey: 'mock_key' });
    assert.equal(res.status, 'NOT_CHECKED');
    assert.equal(res.detail, 'IP address host');
  });

  test('Free plan 402/403 returns UNAVAILABLE "Plan does not include this data"', async () => {
    global.fetch = async () => ({ ok: false, status: 403 });

    const res = await checkSecurityTrails({ host: 'example.com' }, { apiKey: 'mock_key' });
    assert.equal(res.status, 'UNAVAILABLE');
    assert.equal(res.detail, 'Plan does not include this data');
  });

  test('Very new domain (< 30 days) returns SUSPICIOUS', async () => {
    const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        hostname: 'example.com',
        current_dns: {
          a: {
            first_seen: recentDate,
            values: [{ ip: '93.184.216.34' }],
          },
        },
      }),
    });

    const res = await checkSecurityTrails({ host: 'example.com' }, { apiKey: 'mock_key' });
    assert.equal(res.status, 'SUSPICIOUS');
    assert.ok(res.detail.includes('Very new domain'));
  });
});

describe('Threat Intelligence Orchestrator & Caching', () => {
  beforeEach(() => {
    _clearCache();
    _resetCircuitBreakers();
    _resetRateGuard();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    _clearCache();
    _resetCircuitBreakers();
    _resetRateGuard();
  });

  test('Enrichment preserves fixed sources order', async () => {
    const urlItem = {
      url: 'https://example.com/jobs',
      host: 'example.com',
      heuristic_score: 10,
      verdict: 'clean',
      reasons: [],
    };

    const [enriched] = await enrichUrls([urlItem]);
    assert.ok(enriched);
    assert.equal(enriched.sources.length, 6);
    assert.equal(enriched.sources[0].name, 'GOOGLE SAFE BROWSING');
    assert.equal(enriched.sources[1].name, 'VIRUSTOTAL');
    assert.equal(enriched.sources[2].name, 'URLHAUS');
    assert.equal(enriched.sources[3].name, 'ABUSEIPDB');
    assert.equal(enriched.sources[4].name, 'SECURITYTRAILS');
    assert.equal(enriched.sources[5].name, 'HEURISTIC ENGINE');
  });

  test('Allowlisted hosts skip external lookups', async () => {
    const urlItem = {
      url: 'https://www.google.com/search',
      host: 'www.google.com',
      heuristic_score: 5,
      verdict: 'clean',
      reasons: [],
    };

    let fetchCalls = 0;
    global.fetch = async () => {
      fetchCalls++;
      return { ok: true, status: 200, json: async () => ({}) };
    };

    const [enriched] = await enrichUrls([urlItem]);
    assert.equal(fetchCalls, 0, 'No fetch calls should be made for allowlisted hosts');
    assert.equal(enriched.sources[0].status, 'NOT_CHECKED');
    assert.equal(enriched.sources[0].detail, 'Allowlisted safe domain');
  });

  test('Cache hit makes zero duplicate fetch calls', async () => {
    const origEnv = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
    try {
      process.env.GOOGLE_SAFE_BROWSING_API_KEY = 'mock_key';
      let fetchCount = 0;

      global.fetch = async () => {
        fetchCount++;
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        };
      };

      const urlItem = {
        url: 'https://check-cache-hit.com/path',
        host: 'check-cache-hit.com',
        heuristic_score: 20,
        verdict: 'clean',
        reasons: [],
      };

      await enrichUrls([urlItem]);
      const firstCount = fetchCount;
      assert.ok(firstCount > 0, 'First call should query fetch');

      // Second identical call
      await enrichUrls([urlItem]);
      assert.equal(fetchCount, firstCount, 'Second call should be served entirely from LRU cache');
    } finally {
      if (origEnv === undefined) {
        delete process.env.GOOGLE_SAFE_BROWSING_API_KEY;
      } else {
        process.env.GOOGLE_SAFE_BROWSING_API_KEY = origEnv;
      }
    }
  });

  test('Circuit breaker opens after 3 consecutive failures', async () => {
    const origEnv = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
    try {
      process.env.GOOGLE_SAFE_BROWSING_API_KEY = 'mock_key';
      let fetchCalls = 0;

      global.fetch = async () => {
        fetchCalls++;
        return { ok: false, status: 500 };
      };

      const urlItem1 = { url: 'https://fail1.com', host: 'fail1.com', heuristic_score: 10 };
      const urlItem2 = { url: 'https://fail2.com', host: 'fail2.com', heuristic_score: 10 };
      const urlItem3 = { url: 'https://fail3.com', host: 'fail3.com', heuristic_score: 10 };
      const urlItem4 = { url: 'https://fail4.com', host: 'fail4.com', heuristic_score: 10 };

      await enrichUrls([urlItem1]);
      await enrichUrls([urlItem2]);
      await enrichUrls([urlItem3]);

      // 4th call should hit circuit breaker cooldown for GSB
      const [res4] = await enrichUrls([urlItem4]);
      const gsbSource = res4.sources.find((s) => s.name === 'GOOGLE SAFE BROWSING');
      assert.equal(gsbSource.status, 'UNAVAILABLE');
      assert.equal(gsbSource.detail, 'Provider in cooldown');
    } finally {
      if (origEnv === undefined) {
        delete process.env.GOOGLE_SAFE_BROWSING_API_KEY;
      } else {
        process.env.GOOGLE_SAFE_BROWSING_API_KEY = origEnv;
      }
    }
  });
});

describe('Verdict Combination & Job Shield Integration', () => {
  test('External FLAGGED turns heuristically clean URL into flagged', () => {
    const base = {
      url: 'https://deceptive-clean.com',
      host: 'deceptive-clean.com',
      heuristic_score: 15,
      verdict: 'clean',
      reasons: [],
    };

    const external = [
      { name: 'GOOGLE SAFE BROWSING', status: 'FLAGGED', detail: 'Flagged as phishing by Google Safe Browsing' },
      { name: 'VIRUSTOTAL', status: 'CLEAN' },
    ];

    const combined = combineUrlVerdict(base, external);
    assert.equal(combined.verdict, 'flagged');
    assert.equal(combined.final_score, 95);
    assert.equal(combined.intel_score, 95);
    assert.ok(combined.reasons.some((r) => r.includes('phishing')));
  });

  test('All keys missing produces Stage 3A compatible output with limited coverage note', () => {
    const base = {
      url: 'https://regular-job.com',
      host: 'regular-job.com',
      heuristic_score: 20,
      verdict: 'clean',
      reasons: [],
    };

    const combined = combineUrlVerdict(base, []);
    assert.equal(combined.verdict, 'clean');
    assert.equal(combined.final_score, 20);
    assert.equal(combined.intel_score, 0);
    assert.equal(combined.note, 'Limited threat-intelligence coverage.');
  });

  test('getIntelStatus never outputs secret values', () => {
    const status = getIntelStatus();
    assert.ok(status);
    const validStates = new Set(['ready', 'no_key', 'cooldown']);

    for (const [provider, st] of Object.entries(status)) {
      assert.ok(validStates.has(st), `Provider ${provider} had unexpected status ${st}`);
    }
  });
});
