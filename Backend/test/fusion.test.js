import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { initSocket } from '../src/sockets/index.js';
import {
  evaluateFusionRules,
  FUSION_CONFIG,
} from '../src/services/fusion/fusionRules.js';
import { buildAttackChain } from '../src/services/fusion/fusionChain.js';
import { buildPlaybook } from '../src/services/fusion/playbook.js';
import {
  buildIncidentReport,
  sanitizeIncidentNote,
} from '../src/services/fusion/incidentReport.js';
import {
  getHistoryStats,
  getRecentScans,
} from '../src/services/fusion/history.service.js';

describe('Fusion Rules Scoring & Peak Guard', () => {
  test('All three shields active produces fused >= 85 and Coordinated Multi-Stage label', () => {
    const inputs = {
      voice: { risk: 80, threat: 'AI Deepfake Call' },
      job: { risk: 85, threat: 'Recruitment Fee Scam' },
      sim: { risk: 90, threat: 'SIM Swap Confirmed' },
    };

    const res = evaluateFusionRules(inputs);
    assert.ok(res.fusedRisk >= 85, `Expected fusedRisk >= 85, got ${res.fusedRisk}`);
    assert.equal(res.level, 'critical');
    assert.equal(res.threat, 'Coordinated Multi-Stage Fraud Attack');
    assert.equal(res.activeCount, 3);
    assert.equal(res.bonus, 20);
    assert.equal(res.coverage, 'full');
  });

  test('Single active shield preserves its own threat and does not over-inflate', () => {
    const inputs = {
      voice: { risk: 10, threat: 'Clean voice' },
      job: { risk: 65, threat: 'Healthcare Job Lure' },
      sim: { risk: 0, threat: 'Normal line' },
    };

    const res = evaluateFusionRules(inputs);
    assert.equal(res.activeCount, 1);
    assert.equal(res.threat, 'Healthcare Job Lure');
    assert.equal(res.bonus, 0);
    assert.ok(res.fusedRisk >= 58 && res.fusedRisk <= 65);
  });

  test('All clear shields produce low risk and clean threat label', () => {
    const inputs = {
      voice: { risk: 10 },
      job: { risk: 15 },
      sim: { risk: 5 },
    };

    const res = evaluateFusionRules(inputs);
    assert.equal(res.activeCount, 0);
    assert.equal(res.level, 'low');
    assert.equal(res.threat, 'No Coordinated Fraud Pattern');
    assert.equal(res.bonus, 0);
  });

  test('Correlation bonuses: 2 active (+10) and escalated emergency claim (+5)', () => {
    const inputs = {
      job: {
        risk: 70,
        emergency_claim: { detected: true, escalated: true },
      },
      voice: { risk: 65 },
    };

    const res = evaluateFusionRules(inputs);
    assert.equal(res.activeCount, 2);
    // 10 (two active) + 5 (escalated emergency with voice active) = 15
    assert.equal(res.bonus, 15);
  });

  test('Peak guard prevents dilution: voice 90 + job 0 stays >= 81', () => {
    const inputs = {
      voice: { risk: 90 },
      job: { risk: 0 },
    };

    const res = evaluateFusionRules(inputs);
    // 0.90 * 90 = 81
    assert.ok(res.fusedRisk >= 81, `Expected fusedRisk >= 81, got ${res.fusedRisk}`);
  });

  test('Missing shields dynamically re-normalize weights', () => {
    // Only SIM present (base weight 0.40) -> re-normalizes to 1.0
    const inputs = {
      sim: { risk: 50 },
    };

    const res = evaluateFusionRules(inputs);
    assert.equal(res.weightedScore, 50);
    assert.equal(res.coverage, 'single');
    assert.equal(res.confidence, 0.50); // 0.5 + 0.1 (present) - 0.1 (single) = 0.50
  });

  test('Client-supplied fused/level parameters are ignored and strictly recomputed', () => {
    const inputs = {
      job: { risk: 95, level: 'low' }, // Tampered level
    };

    const res = evaluateFusionRules(inputs);
    assert.equal(res.level, 'critical'); // Correctly recomputed from 95
  });
});

describe('Attack Chain Reconstruction', () => {
  test('DRAIN stage is predicted when TAKEOVER is detected', () => {
    const inputs = {
      job: { risk: 50 },
      sim: { risk: 65 }, // active -> takeover detected
    };

    const chain = buildAttackChain({ inputs, fusedRisk: 65, activeCount: 2 });
    const drainStage = chain.stages.find((s) => s.id === 'drain');
    assert.equal(drainStage.status, 'predicted');
    assert.ok(chain.nextLikelyStep.includes('OTP access'));
  });

  test('DRAIN stage is predicted when fusedRisk >= 80 even without SIM', () => {
    const inputs = {
      voice: { risk: 90 },
      job: { risk: 85 },
    };

    const chain = buildAttackChain({ inputs, fusedRisk: 86, activeCount: 2 });
    const drainStage = chain.stages.find((s) => s.id === 'drain');
    assert.equal(drainStage.status, 'predicted');
  });

  test('Evidence list is capped at max 3 items per stage', () => {
    const inputs = {
      job: {
        risk: 80,
        signals: [
          { name: 'S1', detail: 'D1' },
          { name: 'S2', detail: 'D2' },
          { name: 'S3', detail: 'D3' },
          { name: 'S4', detail: 'D4' },
          { name: 'S5', detail: 'D5' },
        ],
      },
    };

    const chain = buildAttackChain({ inputs, fusedRisk: 80, activeCount: 1 });
    const lureStage = chain.stages.find((s) => s.id === 'lure');
    assert.equal(lureStage.evidence.length, 3);
  });
});

describe('Response Playbook & Containment Directives', () => {
  test('Playbook contains universal OTP guard and triggered vector steps', () => {
    const inputs = {
      voice: { risk: 60 },
      job: { risk: 70, emergency_claim: { detected: true } },
      sim: { risk: 80 },
    };

    const playbook = buildPlaybook({ inputs, fusedRisk: 85, level: 'critical' });
    const titles = playbook.steps.map((s) => s.title);

    assert.ok(titles.some((t) => t.includes('Do not share OTP')));
    assert.ok(titles.some((t) => t.includes('relative directly')));
    assert.ok(titles.some((t) => t.includes('End the call')));
    assert.ok(titles.some((t) => t.includes('Do not pay any fee')));
    assert.ok(titles.some((t) => t.includes('carrier gating')));
    assert.ok(titles.some((t) => t.includes('1930')));
  });

  test('Simulated flags are strictly set on non-executable actions', () => {
    const inputs = {
      sim: { risk: 75 },
    };

    const playbook = buildPlaybook({ inputs, fusedRisk: 75, level: 'high' });
    const simFreezeStep = playbook.steps.find((s) => s.id === 'sim_freeze_protocol');
    assert.ok(simFreezeStep !== undefined);
    assert.equal(simFreezeStep.simulated, true);
    assert.equal(playbook.guardianAlert.simulated, true);
  });

  test('Guardian alert recommended only when fusedRisk >= 60', () => {
    const lowPb = buildPlaybook({ inputs: {}, fusedRisk: 45, level: 'medium' });
    assert.equal(lowPb.guardianAlert.recommended, false);

    const highPb = buildPlaybook({ inputs: {}, fusedRisk: 65, level: 'high' });
    assert.equal(highPb.guardianAlert.recommended, true);
  });

  test('No invented phone numbers appear in playbook except 1930', () => {
    const inputs = {
      voice: { risk: 90 },
      job: { risk: 90 },
      sim: { risk: 90 },
    };
    const playbook = buildPlaybook({ inputs, fusedRisk: 95, level: 'critical' });
    const allText = JSON.stringify(playbook);
    const phoneRuns = allText.match(/\b\d{4,}\b/g) || [];
    // Only '1930' is permitted
    for (const num of phoneRuns) {
      assert.equal(num, '1930', `Unexpected phone number run detected: ${num}`);
    }
  });
});

describe('Incident Report Generation & Privacy', () => {
  test('Markdown report contains whitelisted fields and embeds sanitized incident note', () => {
    const report = buildIncidentReport({
      fusedRisk: 85,
      level: 'critical',
      threat: 'Coordinated Multi-Stage Fraud Attack',
      chainStages: [
        { order: 1, label: 'LURE', title: 'Fake Job', shield: 'job', status: 'detected' },
      ],
      signals: [{ name: 'Job: Fee demand', severity: 'high' }],
      playbookSteps: [{ title: 'Do not pay fees' }],
      incidentNote: 'HR requested ₹5,000 via UPI.',
    });

    assert.ok(report.markdown.includes('# MediTrust Incident Forensic Report'));
    assert.ok(report.markdown.includes('User note (unverified)'));
    assert.ok(report.markdown.includes('HR requested ₹5,000 via UPI.'));
    assert.ok(report.markdown.includes('cybercrime.gov.in'));
  });

  test('Sanitizes incident note by stripping control characters and capping length', () => {
    const rawNote = 'Note with control \x00\x08 characters' + 'a'.repeat(600);
    const cleaned = sanitizeIncidentNote(rawNote);
    assert.ok(!cleaned.includes('\x00'));
    assert.equal(cleaned.length, 500);
  });
});

describe('History Aggregation & Anonymous Scans', () => {
  test('Gracefully returns zero statistics when DB is disconnected without throwing', async () => {
    // Force readyState check by stubbing or checking disconnected behavior
    const prevReadyState = mongoose.connection.readyState;
    // Set to disconnected (0)
    Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });

    const stats = await getHistoryStats();
    assert.equal(stats.totalScans, 0);
    assert.equal(stats.db, 'disconnected');
    assert.equal(stats.byShield.voice, 0);

    const recent = await getRecentScans();
    assert.deepEqual(recent, []);

    Object.defineProperty(mongoose.connection, 'readyState', { value: prevReadyState, configurable: true });
  });
});

describe('Fusion API Routes & Server Integration', () => {
  let server;
  let baseUrl;
  let socketServer;

  before(async () => {
    const app = createApp();
    server = http.createServer(app);
    socketServer = initSocket(server);
    app.set('io', socketServer);

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    if (socketServer) {
      await new Promise((resolve) => socketServer.close(resolve));
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('POST /api/fusion/evaluate returns 200 with complete fused shield result', async () => {
    const res = await fetch(`${baseUrl}/api/fusion/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voice: { risk: 80, threat: 'Synthetic Voice' },
        job: { risk: 85, threat: 'Fake Recruiter' },
        sim: { risk: 90, threat: 'SIM Swap Active' },
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.shield, 'fusion');
    assert.ok(data.risk >= 85);
    assert.equal(data.level, 'critical');
    assert.equal(data.threat, 'Coordinated Multi-Stage Fraud Attack');
    assert.ok(data.confidence >= 0.8);
    assert.ok(Array.isArray(data.signals));
    assert.ok(Array.isArray(data.playbook.steps));
    assert.equal(data.guardianAlert.recommended, true);
    assert.ok(data.ai.summary_en.length > 0);
  });

  test('POST /api/fusion/evaluate rejects empty body with 400 NO_INPUT', async () => {
    const res = await fetch(`${baseUrl}/api/fusion/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.code, 'NO_INPUT');
  });

  test('POST /api/fusion/evaluate rejects prohibited phone-like numbers in text fields', async () => {
    const res = await fetch(`${baseUrl}/api/fusion/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job: {
          risk: 50,
          threat: 'Call 9820144210 now for job', // Contains 10-digit number
        },
      }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.code, 'VALIDATION_ERROR');
  });

  test('POST /api/fusion/report generates markdown incident report', async () => {
    const res = await fetch(`${baseUrl}/api/fusion/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job: { risk: 75, threat: 'Hospital Job Scam' },
        incidentNote: 'Received WhatsApp offer letter demanding registration fee.',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.title, 'MediTrust Incident Forensic Report');
    assert.ok(data.markdown.includes('MediTrust Incident Forensic Report'));
    assert.ok(data.markdown.includes('Received WhatsApp offer letter'));
  });

  test('GET /api/fusion/history/stats returns 200 with platform stats', async () => {
    const res = await fetch(`${baseUrl}/api/fusion/history/stats`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.byShield !== undefined);
    assert.ok(data.note.includes('Anonymous demo statistics'));
  });

  test('GET /api/fusion/history/recent returns 200 with list of scans', async () => {
    const res = await fetch(`${baseUrl}/api/fusion/history/recent?limit=5`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });

  test('Deprecated POST /api/test/llm now returns 404 NOT_FOUND', async () => {
    const res = await fetch(`${baseUrl}/api/test/llm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello test' }),
    });

    assert.equal(res.status, 404);
  });
});
