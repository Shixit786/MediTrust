#!/usr/bin/env node
/**
 * scripts/fusion-smoke.mjs
 * End-to-end smoke verification for the MediTrust Fusion Engine.
 *
 * Usage:
 *   node scripts/fusion-smoke.mjs --scenario full
 *   node scripts/fusion-smoke.mjs --scenario voice-job
 *   node scripts/fusion-smoke.mjs --scenario single
 *   node scripts/fusion-smoke.mjs --scenario clear
 *   node scripts/fusion-smoke.mjs --json "C:/path/to/custom_input.json"
 */

import fs from 'node:fs';

const TARGET_HOST = process.env.API_BASE_URL || 'http://127.0.0.1:5000';

const SCENARIOS = {
  full: {
    name: 'FULL ATTACK CHAIN (All 3 Vectors Active)',
    payload: {
      job: {
        risk: 85,
        threat: 'Recruitment Fee Scam',
        signals: [
          { name: 'Upfront fee requested', detail: 'Demands ₹5,000 onboarding security deposit', severity: 'high' },
          { name: 'Urgent OTP requirement', detail: 'Recruiter asked for verification OTP', severity: 'high' },
        ],
      },
      voice: {
        risk: 80,
        threat: 'AI Deepfake Impersonation',
        signals: [
          { name: 'Acoustic Flatness', detail: 'High-frequency spectral cutoff detected', severity: 'medium' },
          { name: 'Synthetic Cadence', detail: 'Robotic prosody anomaly detected', severity: 'high' },
        ],
      },
      sim: {
        risk: 90,
        threat: 'SIM Swap Active',
        signals: [
          { name: 'IMSI Circuit Re-allocation', detail: 'Carrier telecom transfer in progress', severity: 'critical' },
          { name: 'OTP Flood Spike', detail: '8 OTPs requested in under 60 seconds', severity: 'high' },
        ],
      },
    },
  },
  'voice-job': {
    name: 'VOICE + JOB CORRELATION (Two Vectors Active)',
    payload: {
      job: {
        risk: 80,
        threat: 'Hospital Recruitment Phishing',
        emergency_claim: { detected: true, escalated: true },
        signals: [
          { name: 'Emergency medical recruitment claim', detail: 'Immediate deployment fee requested', severity: 'critical' },
        ],
      },
      voice: {
        risk: 75,
        threat: 'Synthetic HR Call',
        signals: [
          { name: 'Cloned Vocal Signature', detail: 'Vocal timbre matches neural clone', severity: 'high' },
        ],
      },
    },
  },
  single: {
    name: 'SINGLE ACTIVE VECTOR (Job Only)',
    payload: {
      job: {
        risk: 70,
        threat: 'Fake Nursing Placement',
        signals: [
          { name: 'Unverified Domain', detail: 'Email sent from suspicious look-alike domain', severity: 'medium' },
        ],
      },
      voice: {
        risk: 15,
        threat: 'Normal Vocal Baseline',
        signals: [],
      },
      sim: {
        risk: 5,
        threat: 'No SIM Anomaly',
        signals: [],
      },
    },
  },
  clear: {
    name: 'CLEAN BASELINE (All Clear)',
    payload: {
      job: {
        risk: 10,
        threat: 'Clean Offer',
        signals: [],
      },
      voice: {
        risk: 12,
        threat: 'Human Voice Authenticated',
        signals: [],
      },
      sim: {
        risk: 0,
        threat: 'Normal Line',
        signals: [],
      },
    },
  },
};

function parseArgs() {
  const args = process.argv.slice(2);
  let scenario = 'full';
  let jsonPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--scenario' && args[i + 1]) {
      scenario = args[i + 1].replace(/['"]/g, '').toLowerCase();
      i++;
    } else if (args[i] === '--json' && args[i + 1]) {
      jsonPath = args[i + 1].replace(/['"]/g, '');
      i++;
    }
  }

  return { scenario, jsonPath };
}

async function runFusionSmoke() {
  const { scenario, jsonPath } = parseArgs();
  let payload;
  let title;

  if (jsonPath) {
    if (!fs.existsSync(jsonPath)) {
      console.error(`Error: JSON file not found at ${jsonPath}`);
      process.exit(1);
    }
    payload = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    title = `Custom JSON Input (${jsonPath})`;
  } else {
    const selected = SCENARIOS[scenario] || SCENARIOS.full;
    payload = selected.payload;
    title = selected.name;
  }

  console.log('================================================================');
  console.log(' FUSION ENGINE SMOKE TEST');
  console.log(` Target:    ${TARGET_HOST}/api/fusion/evaluate`);
  console.log(` Scenario:  ${title}`);
  console.log('================================================================\n');

  const start = Date.now();
  const res = await fetch(`${TARGET_HOST}/api/fusion/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const elapsedMs = Date.now() - start;

  if (!res.ok) {
    console.error(`HTTP Evaluation Failed: ${res.status} (${elapsedMs} ms)`);
    console.error(await res.text());
    process.exit(1);
  }

  const data = await res.json();

  console.log(`HTTP Status:     ${res.status} OK (${elapsedMs} ms)`);
  console.log(`Composite Risk:  ${data.risk}/100 [${data.level.toUpperCase()}]`);
  console.log(`Threat Pattern:  ${data.threat}`);
  console.log(`Confidence:      ${data.confidence} (Coverage: ${data.coverage.toUpperCase()})`);
  console.log(`AI Provider:     ${data.ai?.provider}`);
  console.log(`Guardian Alert:  ${data.guardianAlert?.recommended ? 'RECOMMENDED' : 'NOT RECOMMENDED'}`);
  console.log(`Disclaimer:      ${data.disclaimer}\n`);

  console.log('--- 4-STAGE ATTACK CHAIN RECONSTRUCTION ---');
  (data.chain?.stages || []).forEach((st) => {
    console.log(
      `  Stage 0${st.order} [${st.label}] -> STATUS: ${st.status.toUpperCase()} | ` +
      `Risk: ${st.risk !== null ? `${st.risk}/100` : '--'}`
    );
  });
  if (data.chain?.summary) {
    console.log(`  Chain Summary: "${data.chain.summary}"`);
  }
  if (data.chain?.nextLikelyStep) {
    console.log(`  Next Trajectory: "${data.chain.nextLikelyStep}"`);
  }

  console.log('\n--- RECOMMENDED RESPONSE PLAYBOOK ---');
  (data.playbook?.steps || []).forEach((step) => {
    const simTag = step.simulated ? ' [SIMULATED]' : '';
    console.log(`  ${step.order}. [${step.priority.toUpperCase()}] ${step.title}${simTag}`);
  });

  console.log('\n--- AI SYNTHESIS SUMMARY ---');
  console.log(`  ${data.ai?.summary_en}\n`);

  // Verify Incident Report Endpoint
  console.log('--- VERIFYING INCIDENT REPORT ENDPOINT (POST /api/fusion/report) ---');
  const reportStart = Date.now();
  const reportRes = await fetch(`${TARGET_HOST}/api/fusion/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      incidentNote: 'Emergency test incident note for smoke verification.',
    }),
  });
  const reportElapsed = Date.now() - reportStart;

  if (reportRes.ok) {
    const reportData = await reportRes.json();
    console.log(`Report Endpoint: HTTP 200 OK (${reportElapsed} ms)`);
    console.log(`Report Title:    ${reportData.title}`);
    console.log(`Markdown Size:   ${reportData.markdown?.length} characters`);
    console.log(`Report To:       ${reportData.reportTo?.map((r) => r.name).join(', ')}`);
  } else {
    console.error(`Report Endpoint Failed: HTTP ${reportRes.status}`);
  }

  console.log('\n================================================================');
  console.log(' FUSION SMOKE VERIFICATION COMPLETED SUCCESSFULLY');
  console.log('================================================================');
}

runFusionSmoke().catch((err) => {
  console.error('Fatal error during fusion smoke test:', err);
  process.exit(1);
});
