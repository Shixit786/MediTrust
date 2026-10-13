/**
 * MediTrust Shared Demo Attack Engine
 * Deterministic, cancellable, idempotent simulation sequence for Fusion, Dashboard, and Presenter.
 * Uses mock scenario data (job: 92, voice: 87, sim: 95) independent of the backend.
 */

import { useAnalysisStore } from '../store/useAnalysisStore';
import { evaluateFusion as calculateFusionRules } from './fusionRules';
import { emitThreatFeedEvent, emitThreatFeedReset } from './threatFeedEvents';
import type { ShieldResult, FusionResult } from '../types/analysis';

import jobMock from './mocks/job.json';
import voiceMock from './mocks/voice.json';
import simMock from './mocks/sim.json';

function getNowTimestamp(): string {
  const d = new Date();
  return d.toTimeString().split(' ')[0];
}

let activeTimeouts: number[] = [];
let isRunning = false;

export function isDemoAttackActive(): boolean {
  return isRunning;
}

export function cancelDemoAttack(): void {
  activeTimeouts.forEach((tid) => clearTimeout(tid));
  activeTimeouts = [];
  isRunning = false;
  useAnalysisStore.getState().setDemoAttackRunning(false);
}

export function resetDemoAttackSequence(): void {
  cancelDemoAttack();
  emitThreatFeedReset();
  const store = useAnalysisStore.getState();
  store.resetDemoAttack();
  store.resetDemo();
  store.setBlobTone('idle');
}

export function skipDemoAttackToResult(): void {
  cancelDemoAttack();

  const store = useAnalysisStore.getState();

  const jobResult: ShieldResult = { ...(jobMock as unknown as ShieldResult), _source: 'demo' };
  const voiceResult: ShieldResult = { ...(voiceMock as unknown as ShieldResult), _source: 'demo' };
  const simResult: ShieldResult = { ...(simMock as unknown as ShieldResult), _source: 'demo' };

  store.setShieldResult('job', jobResult);
  store.setShieldStatus('job', 'done');

  store.setShieldResult('voice', voiceResult);
  store.setShieldStatus('voice', 'done');

  store.setShieldResult('sim', simResult);
  store.setShieldStatus('sim', 'done');

  const evaluated = calculateFusionRules({
    job: jobResult,
    voice: voiceResult,
    sim: simResult,
  });

  const fullResult: FusionResult = {
    ...evaluated,
    overall_risk: 94,
    level: 'critical',
    pattern: 'Coordinated Multi-Stage Fraud',
    actions: [
      'Freeze SIM & Bank accounts (SIMULATED)',
      'Block spoofed caller ID',
      'Alert hospital security contact',
    ],
  };
  (fullResult as { _source?: string })._source = 'demo';

  store.setFusionResult(fullResult);
  store.setBlobTone('critical');
  store.setDemoAttackStage(5);
  store.setDemoAttackProgress(1.0);
  store.setDemoStatus('done');
  store.setDemoAttackRunning(false);

  emitThreatFeedEvent({
    id: `evt-${Date.now()}-skip-done`,
    timestamp: getNowTimestamp(),
    shield: 'fusion',
    message: 'Attack correlation complete: CRITICAL healthcare fraud incident confirmed (SIMULATED)',
    severity: 'critical',
  });
}

export interface RunDemoAttackOptions {
  speed?: number; // 1 = normal (~11.5s), 2 = fast, etc.
  onComplete?: () => void;
}

export function runDemoAttack(options: RunDemoAttackOptions = {}): void {
  // Idempotent: Ignore if already running
  if (isRunning) {
    return;
  }

  const speed = Math.max(0.2, options.speed ?? 1.0);
  const scale = 1 / speed;

  cancelDemoAttack();
  emitThreatFeedReset();

  const store = useAnalysisStore.getState();

  // Backup real scans if present
  const hasLiveResults = Object.values(store.shieldResults).some(
    (r) => r && r._source === 'live'
  );
  if (hasLiveResults) {
    store.backupRealShields();
  }

  isRunning = true;
  store.setDemoAttackRunning(true);
  store.setDemoStatus('running');
  store.setBlobTone('idle');

  // Initial event
  emitThreatFeedEvent({
    id: `evt-${Date.now()}-init`,
    timestamp: getNowTimestamp(),
    shield: 'system',
    message: 'Multi-vector threat simulation sequence initiated (SIMULATED DEMO)',
    severity: 'low',
  });

  const schedule = (fn: () => void, delayMs: number) => {
    const tid = window.setTimeout(fn, Math.round(delayMs * scale));
    activeTimeouts.push(tid);
  };

  // ----------------------------------------------------
  // Stage 1: 01 FAKE JOB OFFER (0ms to 2800ms)
  // ----------------------------------------------------
  schedule(() => {
    store.setDemoAttackStage(1);
    store.setDemoAttackProgress(0.08);
    store.setShieldStatus('job', 'scanning');
    emitThreatFeedEvent({
      id: `evt-${Date.now()}-job-scan`,
      timestamp: getNowTimestamp(),
      shield: 'job',
      message: 'WhatsApp recruitment PDF ingested: extracting URLs and signatures',
      severity: 'medium',
    });
  }, 100);

  schedule(() => {
    const jobResult: ShieldResult = { ...(jobMock as unknown as ShieldResult), _source: 'demo' };
    store.setShieldResult('job', jobResult);
    store.setShieldStatus('job', 'done');
    store.setDemoAttackProgress(0.25);
    emitThreatFeedEvent({
      id: `evt-${Date.now()}-job-hit1`,
      timestamp: getNowTimestamp(),
      shield: 'job',
      message: 'Job offer demands refundable verification fee ₹2,450: FLAGGED',
      severity: 'high',
    });
    emitThreatFeedEvent({
      id: `evt-${Date.now()}-job-hit2`,
      timestamp: getNowTimestamp(),
      shield: 'job',
      message: 'Hospital recruitment URL matches phishing heuristics (VirusTotal 14/70)',
      severity: 'critical',
    });
  }, 1200);

  // ----------------------------------------------------
  // Stage 2: 02 SUSPICIOUS VOICE CALL (2800ms to 5600ms)
  // ----------------------------------------------------
  schedule(() => {
    store.setDemoAttackStage(2);
    store.setDemoAttackProgress(0.35);
    store.setShieldStatus('voice', 'scanning');
    emitThreatFeedEvent({
      id: `evt-${Date.now()}-voice-scan`,
      timestamp: getNowTimestamp(),
      shield: 'voice',
      message: 'Inbound HR voice call: acoustic spectrogram and MFCC extraction started',
      severity: 'medium',
    });
  }, 2800);

  schedule(() => {
    const voiceResult: ShieldResult = { ...(voiceMock as unknown as ShieldResult), _source: 'demo' };
    store.setShieldResult('voice', voiceResult);
    store.setShieldStatus('voice', 'done');
    store.setDemoAttackProgress(0.50);
    emitThreatFeedEvent({
      id: `evt-${Date.now()}-voice-hit`,
      timestamp: getNowTimestamp(),
      shield: 'voice',
      message: 'Synthetic voice clone flagged (87% synthetic probability, pitch variance 91/100)',
      severity: 'high',
    });
  }, 4000);

  // ----------------------------------------------------
  // Stage 3: 03 SIM-SWAP SIMULATION (5600ms to 8400ms)
  // ----------------------------------------------------
  schedule(() => {
    store.setDemoAttackStage(3);
    store.setDemoAttackProgress(0.60);
    store.setShieldStatus('sim', 'scanning');
    emitThreatFeedEvent({
      id: `evt-${Date.now()}-sim-scan`,
      timestamp: getNowTimestamp(),
      shield: 'sim',
      message: 'Carrier audit triggered: analyzing HLR/VLR roaming anomaly and IMSI timestamps',
      severity: 'medium',
    });
  }, 5600);

  schedule(() => {
    const simResult: ShieldResult = { ...(simMock as unknown as ShieldResult), _source: 'demo' };
    store.setShieldResult('sim', simResult);
    store.setShieldStatus('sim', 'done');
    store.setDemoAttackProgress(0.75);
    emitThreatFeedEvent({
      id: `evt-${Date.now()}-sim-hit1`,
      timestamp: getNowTimestamp(),
      shield: 'sim',
      message: 'SIM swap anomaly confirmed: IMSI changed 12 mins ago without carrier notification',
      severity: 'critical',
    });
    emitThreatFeedEvent({
      id: `evt-${Date.now()}-sim-hit2`,
      timestamp: getNowTimestamp(),
      shield: 'sim',
      message: 'Banking SMS OTP flood intercepted on compromised device',
      severity: 'critical',
    });
  }, 6800);

  // ----------------------------------------------------
  // Stage 4: 04 FUSION ENGINE (8400ms to 11000ms)
  // ----------------------------------------------------
  schedule(() => {
    store.setDemoAttackStage(4);
    store.setDemoAttackProgress(0.88);
    emitThreatFeedEvent({
      id: `evt-${Date.now()}-fusion-correlate`,
      timestamp: getNowTimestamp(),
      shield: 'fusion',
      message: 'Cross-vector correlation detected: Phishing + Deepfake HR + SIM Hijack',
      severity: 'critical',
    });
  }, 8400);

  // ----------------------------------------------------
  // Stage 5: Complete & Reveal Verdict (~11200ms)
  // ----------------------------------------------------
  schedule(() => {
    const jobResult: ShieldResult = { ...(jobMock as unknown as ShieldResult), _source: 'demo' };
    const voiceResult: ShieldResult = { ...(voiceMock as unknown as ShieldResult), _source: 'demo' };
    const simResult: ShieldResult = { ...(simMock as unknown as ShieldResult), _source: 'demo' };

    const evaluated = calculateFusionRules({
      job: jobResult,
      voice: voiceResult,
      sim: simResult,
    });

    const fullResult: FusionResult = {
      ...evaluated,
      overall_risk: 94,
      level: 'critical',
      pattern: 'Coordinated Multi-Stage Fraud',
      actions: [
        'Freeze SIM & Bank accounts (SIMULATED)',
        'Block spoofed caller ID',
        'Alert hospital security contact',
      ],
    };
    (fullResult as { _source?: string })._source = 'demo';

    store.setFusionResult(fullResult);
    store.setBlobTone('critical');
    store.setDemoAttackStage(5);
    store.setDemoAttackProgress(1.0);
    store.setDemoStatus('done');
    store.setDemoAttackRunning(false);
    isRunning = false;

    emitThreatFeedEvent({
      id: `evt-${Date.now()}-final`,
      timestamp: getNowTimestamp(),
      shield: 'fusion',
      message: 'Attack chain synthesized: 94/100 CRITICAL risk. Incident playbook generated.',
      severity: 'critical',
    });

    options.onComplete?.();
  }, 11200);
}
