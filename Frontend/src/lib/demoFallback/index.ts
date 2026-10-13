/**
 * Offline Demo Fallback Layer
 * Safe offline mock data returned when the MediTrust backend cannot be reached.
 * Results are explicitly marked { _source: 'demo' }.
 */

import voiceMock from '../../services/mocks/voice.json';
import voiceAIMock from '../../services/mocks/voiceAI.json';
import voiceAI2Mock from '../../services/mocks/voiceAI2.json';
import voiceHumanMock from '../../services/mocks/voiceHuman.json';

import jobMock from '../../services/mocks/job.json';
import jobScamMock from '../../services/mocks/jobScam.json';
import jobSafeMock from '../../services/mocks/jobSafe.json';

import simMock from '../../services/mocks/sim.json';
import simCarrierMock from '../../services/mocks/simCarrier.json';
import fusionMock from '../../services/mocks/fusion.json';

import type {
  JobShieldBackendResult,
  VoiceShieldBackendResult,
  SimBackendResult,
  FusionBackendResult,
  IncidentReportBackendResult,
  HistoryStatsResponse,
} from '../api/types';

export function getDemoVoiceResult(params?: {
  sampleId?: string | null;
  fileName?: string | null;
  file?: File | Blob | null;
}): VoiceShieldBackendResult {
  let chosen = voiceAIMock;
  if (params?.sampleId === 'real_human') {
    chosen = voiceHumanMock;
  } else if (params?.sampleId === 'patient_support') {
    chosen = voiceAI2Mock;
  } else if (params?.sampleId === 'ai_deepfake') {
    chosen = voiceAIMock;
  } else if (params?.fileName || params?.file) {
    const name = (
      params.fileName || (params.file instanceof File ? params.file.name : '') || ''
    ).toLowerCase();
    if (name.includes('human') || name.includes('real')) {
      chosen = voiceHumanMock;
    } else if (name.includes('support') || name.includes('patient')) {
      chosen = voiceAI2Mock;
    } else {
      chosen = voiceAIMock;
    }
  }

  return {
    ...(chosen as unknown as VoiceShieldBackendResult),
    _source: 'demo',
  };
}

export function getDemoJobResult(params?: {
  text?: string;
  file?: File | null;
}): JobShieldBackendResult {
  let chosen = jobScamMock;
  const rawText = (params?.text || '').toLowerCase();

  if (
    rawText.includes('apex') ||
    rawText.includes('genuine') ||
    rawText.includes('verified candidate')
  ) {
    chosen = jobSafeMock;
  } else if (params?.file) {
    chosen = jobScamMock;
  }

  const result = {
    ...(chosen as unknown as JobShieldBackendResult),
    _source: 'demo' as const,
  };

  if (params?.text && params.text.trim()) {
    result.extracted_text = params.text;
  }

  return result;
}

export function getDemoSimResult(phone?: string): SimBackendResult {
  const masked = phone
    ? `+91 ${phone.slice(0, 2)}••• ••${phone.slice(-3)}`
    : '+91 98••• ••210';

  return {
    phoneMasked: masked,
    simNumber: masked,
    status: 'normal',
    riskScore: 18,
    level: 'low',
    threat: 'Normal Carrier Baseline',
    simulated: true,
    disclaimer:
      'Simulated demo. Real SIM-swap detection needs telecom operator integration. Early warning, not proof.',
    _source: 'demo',
  };
}

export function getDemoSimCarrier(): typeof simCarrierMock {
  return simCarrierMock;
}

export function getDemoFusionResult(): FusionBackendResult {
  return {
    ...(fusionMock as unknown as FusionBackendResult),
    _source: 'demo',
  };
}

export function getDemoIncidentReport(): IncidentReportBackendResult {
  const markdown = `# MediTrust Incident Forensic Report (Demo Fallback)

**Generated:** ${new Date().toISOString()}  
**Composite Risk:** 94/100 [CRITICAL]  
**Classification:** Coordinated Multi-Stage Fraud (Simulated)  

---

## 1. Attack Chain Reconstruction Timeline

- **Stage 01 [LURE - DETECTED]**: Fake hospital recruitment offer
- **Stage 02 [PRESSURE - DETECTED]**: Cloned voice call impersonating HR
- **Stage 03 [TAKEOVER - DETECTED]**: SIM swap anomaly registered
- **Stage 04 [DRAIN - PREDICTED]**: OTP theft / Account takeover risk

## 2. Recommended Actions

1. Freeze associated mobile banking session (simulated)
2. Block incoming requests from spoofed numbers
3. File complaint on Cyber Crime Helpline (1930)

> **Disclaimer:** Early warning, not proof. Fusion combines signals from separate checks and can be wrong. Verify through official channels.`;

  return {
    title: 'MediTrust Incident Forensic Report',
    generatedAt: new Date().toISOString(),
    fused: { risk: 94, level: 'critical', threat: 'Coordinated Multi-Stage Fraud' },
    timeline: [
      { order: 1, label: 'LURE', title: 'Fake Job Offer', shield: 'job', status: 'detected' },
      { order: 2, label: 'PRESSURE', title: 'Deepfake Voice Call', shield: 'voice', status: 'detected' },
      { order: 3, label: 'TAKEOVER', title: 'SIM Swap', shield: 'sim', status: 'detected' },
      { order: 4, label: 'DRAIN', title: 'OTP Theft Risk', shield: 'fusion', status: 'predicted' },
    ],
    indicators: [],
    actionsRecommended: [
      'Freeze associated mobile banking session (simulated)',
      'Block incoming requests from spoofed numbers',
      'File complaint on Cyber Crime Helpline (1930)',
    ],
    reportTo: [
      { name: 'National Cyber Crime Reporting Portal', url: 'https://cybercrime.gov.in' },
      { name: 'Cyber Crime Helpline', contact: '1930' },
    ],
    evidenceChecklist: [
      'Screenshots of messages',
      'Call time and duration',
      'Transaction IDs if any money moved',
      'Telecom or bank SMS alerts',
    ],
    markdown,
    disclaimer:
      'Early warning, not proof. Fusion combines signals from separate checks and can be wrong. Verify through official channels.',
    _source: 'demo',
  };
}

export function getDemoHistoryStats(): HistoryStatsResponse {
  return {
    totalScans: 48,
    byShield: { job: 20, voice: 14, sim: 8, fusion: 6 },
    byLevel: { low: 18, medium: 12, high: 10, critical: 8 },
    avgRisk: 46,
    last7Days: [
      { date: '2026-10-06', count: 5, avgRisk: 38 },
      { date: '2026-10-07', count: 7, avgRisk: 42 },
      { date: '2026-10-08', count: 8, avgRisk: 51 },
      { date: '2026-10-09', count: 6, avgRisk: 40 },
      { date: '2026-10-10', count: 9, avgRisk: 55 },
      { date: '2026-10-11', count: 8, avgRisk: 44 },
      { date: '2026-10-12', count: 5, avgRisk: 49 },
    ],
    topThreats: [
      { threat: 'Healthcare Job Fraud', count: 18 },
      { threat: 'Deepfake Voice Impersonation', count: 12 },
      { threat: 'SIM Swap Attack Pattern', count: 8 },
      { threat: 'No Coordinated Fraud Pattern', count: 10 },
    ],
    db: 'connected',
    note: 'Anonymous demo statistics, not tied to any user.',
    _source: 'demo',
  };
}

export {
  voiceMock,
  voiceAIMock,
  voiceAI2Mock,
  voiceHumanMock,
  jobMock,
  jobScamMock,
  jobSafeMock,
  simMock,
  simCarrierMock,
  fusionMock,
};
