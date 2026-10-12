#!/usr/bin/env node

/**
 * voice-smoke.mjs - Voice Shield CLI smoke test tool.
 * Sends an audio file to POST /api/voice/analyze and prints a compact summary.
 *
 * Usage:
 *   node scripts/voice-smoke.mjs <path-to-audio>
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/voice-smoke.mjs "<path-to-audio>"');
  process.exit(1);
}

// Support unquoted paths with spaces by joining remaining args
const filePath = args.join(' ');

if (!fs.existsSync(filePath)) {
  console.error(`Error: File not found at path: ${filePath}`);
  process.exit(1);
}

const port = process.env.PORT || 5000;
const url = `http://127.0.0.1:${port}/api/voice/analyze`;

async function run() {
  const fileBytes = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  const formData = new FormData();
  const blob = new Blob([fileBytes], { type: `audio/${ext.replace('.', '')}` });
  formData.append('audio', blob, fileName);

  console.log(`\n================================================================`);
  console.log(` VOICE SHIELD SMOKE TEST: ${fileName} (${(fileBytes.length / 1024).toFixed(1)} KB)`);
  console.log(` Target: ${url}`);
  console.log(`================================================================\n`);

  const startTime = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const elapsedMs = Date.now() - startTime;
    const body = await res.json();

    console.log(`HTTP Status: ${res.status} (${elapsedMs} ms)`);

    if (!res.ok) {
      console.log('\n--- ERROR RESPONSE ---');
      console.log(JSON.stringify(body, null, 2));
      process.exit(res.status >= 500 ? 1 : 0);
    }

    console.log('\n--- VERDICT & RISK METRICS ---');
    console.log(`Risk Score:    ${body.risk}/100 [${body.level?.toUpperCase()}]`);
    console.log(`Threat:        ${body.threat}`);
    console.log(`Verdict:       ${body.verdict}`);
    console.log(`Confidence:    ${body.confidence} (${body.reliability} reliability)`);
    console.log(`Duration:      ${body.duration_sec}s`);

    console.log('\n--- ACOUSTIC FEATURES (9) ---');
    if (Array.isArray(body.features)) {
      body.features.forEach((f, i) => {
        const scoreStr = String(f.score).padStart(3, ' ');
        const statusStr = f.status.padEnd(10, ' ');
        console.log(`  ${i + 1}. [${scoreStr}] ${statusStr} ${f.name} (${f.value} ${f.unit})`);
      });
    }

    console.log('\n--- ANOMALIES & PEAKS ---');
    console.log(`Peaks Length:    ${body.peaks?.length ?? 0} points`);
    console.log(`Anomalies Count: ${body.anomalies?.length ?? 0}`);
    if (body.anomalies && body.anomalies.length > 0) {
      body.anomalies.forEach((a) => {
        console.log(`  * [${a.t_start}s - ${a.t_end}s] ${a.feature}: ${a.reason}`);
      });
    }

    console.log('\n--- AI EXPLANATION ---');
    console.log(`Provider:     ${body.ai?.provider}`);
    console.log(`Patterns:     ${(body.ai?.patterns || []).join(', ') || 'None'}`);
    console.log(`Summary:      ${body.ai?.summary_en}`);

    console.log(`\n================================================================`);
    console.log(` SUCCESS: Completed in ${elapsedMs} ms`);
    console.log(`================================================================\n`);
  } catch (err) {
    const elapsedMs = Date.now() - startTime;
    console.error(`Request failed after ${elapsedMs} ms:`, err.message);
    process.exit(1);
  }
}

run();
