#!/usr/bin/env node

/**
 * job-smoke.mjs - CLI smoke test utility for Job Shield POST /api/job/analyze.
 * Usage:
 *   node scripts/job-smoke.mjs --text "<message>"
 *   node scripts/job-smoke.mjs --file "<path-to-pdf>"
 *   node scripts/job-smoke.mjs --sample <name-or-number>
 *
 * Zero external dependencies. Handles spaces in file paths.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BACKEND_URL || `http://127.0.0.1:${PORT}`;
const SAMPLES_DIR = path.join(__dirname, 'job-samples');

const SAMPLE_MAP = {
  1: 'sample1_fake_hospital.txt',
  2: 'sample2_gulf_nursing.txt',
  3: 'sample3_hinglish_scam.txt',
  4: 'sample4_hindi_urgency.txt',
  5: 'sample5_medical_emergency.txt',
  6: 'sample6_genuine_recruiter.txt',
  7: 'sample7_negated_policy.txt',
  8: 'sample8_apolo_lookalike.txt',
  9: 'sample9_genuine_apollo.txt',
  10: 'sample10_unknown_small_company.txt',
  pdf: 'sample_job.pdf',
};

function parseArgs() {
  const args = process.argv.slice(2);
  let text = null;
  let filePath = null;
  let sampleKey = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--text' && args[i + 1]) {
      text = args[++i];
    } else if (args[i] === '--file' && args[i + 1]) {
      filePath = args[++i];
    } else if (args[i] === '--sample' && args[i + 1]) {
      sampleKey = args[++i];
    }
  }

  return { text, filePath, sampleKey };
}

async function run() {
  const { text: rawText, filePath: rawFile, sampleKey } = parseArgs();

  let text = rawText;
  let filePath = rawFile;

  if (sampleKey) {
    const filename = SAMPLE_MAP[sampleKey] || sampleKey;
    const resolved = path.isAbsolute(filename) ? filename : path.join(SAMPLES_DIR, filename);
    if (!fs.existsSync(resolved)) {
      console.error(`Error: Sample fixture not found: ${resolved}`);
      process.exit(1);
    }
    if (resolved.toLowerCase().endsWith('.pdf')) {
      filePath = resolved;
    } else {
      text = fs.readFileSync(resolved, 'utf-8').trim();
    }
  }

  if (!text && !filePath) {
    console.log(`
Usage:
  node scripts/job-smoke.mjs --text "<message text>"
  node scripts/job-smoke.mjs --file "<path-to-pdf>"
  node scripts/job-smoke.mjs --sample <1-10|pdf|filename>
`);
    process.exit(1);
  }

  const targetUrl = `${BASE_URL}/api/job/analyze`;
  console.log('================================================================');
  console.log(` JOB SHIELD SMOKE TEST: ${filePath ? path.basename(filePath) : 'Text Input'}`);
  console.log(` Target: ${targetUrl}`);
  console.log('================================================================\n');

  let requestOptions;
  const start = performance.now();

  if (filePath) {
    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Error: File not found: ${resolvedPath}`);
      process.exit(1);
    }
    const buffer = fs.readFileSync(resolvedPath);
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: 'application/pdf' }), path.basename(resolvedPath));
    requestOptions = {
      method: 'POST',
      body: form,
    };
  } else {
    requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    };
  }

  let response;
  try {
    response = await fetch(targetUrl, requestOptions);
  } catch (err) {
    console.error(`Connection failed to ${targetUrl}:`, err.message);
    console.error('Make sure backend is running on port', PORT);
    process.exit(1);
  }

  const elapsedMs = Math.round(performance.now() - start);
  const data = await response.json();

  console.log(`HTTP Status: ${response.status} (${elapsedMs} ms)\n`);

  if (!response.ok) {
    console.log('--- ERROR RESPONSE ---');
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  }

  console.log('--- VERDICT & RISK METRICS ---');
  console.log(`Risk Score:    ${data.risk}/100 [${(data.level || '').toUpperCase()}]`);
  console.log(`Threat:        ${data.threat}`);
  console.log(`Verdict:       ${data.extra?.verdict || data.verdict}`);
  console.log(`Confidence:    ${data.confidence} (${data.extra?.reliability || 'standard'} reliability)`);

  const scores = data.scores || data.extra?.scores;
  if (scores) {
    console.log(`Component Sc.: Rules: ${scores.rules}, URL: ${scores.url}, LLM: ${scores.llm}, Company: ${scores.company ?? 0}`);
  }

  const comp = data.company || data.extra?.company;
  console.log('\n--- COMPANY VERIFICATION ---');
  console.log(`Company Name:  ${comp?.name ?? '(null)'}`);
  console.log(`Company Score: ${scores?.company ?? comp?.score ?? 0}/100`);
  if (comp?.note) {
    console.log(`Note:          ${comp.note}`);
  }
  if (comp?.checks && Array.isArray(comp.checks)) {
    console.log('Checks:');
    comp.checks.forEach((c) => {
      const detailStr = c.detail ? ` - ${c.detail}` : '';
      console.log(`  * ${c.name.padEnd(23)} [${c.status}]${detailStr}`);
    });
  }

  console.log('\n--- RED FLAGS & HIGHLIGHTS ---');
  const redFlags = data.red_flags || data.extra?.red_flags || [];
  console.log(`Red Flags (${redFlags.length}):`);
  if (redFlags.length === 0) {
    console.log('  (None)');
  } else {
    redFlags.forEach((rf, i) => {
      console.log(`  ${i + 1}. [${rf.severity.toUpperCase()}] ${rf.category} - ${rf.title}`);
    });
  }

  const highlights = data.highlights || data.extra?.highlights || [];
  console.log(`Highlights Count: ${highlights.length}`);

  const emClaim = data.emergency_claim || data.extra?.emergency_claim;
  if (emClaim?.detected) {
    console.log(`Emergency Claim: DETECTED (Relation: ${emClaim.relation}, Escalated: ${emClaim.escalated})`);
  }

  const urls = data.urls || data.extra?.urls || [];
  console.log(`\n--- URLS EVALUATED (${urls.length}) ---`);
  if (urls.length === 0) {
    console.log('  (No URLs found)');
  } else {
    urls.forEach((u, i) => {
      const finalScore = u.final_score !== undefined ? u.final_score : u.heuristic_score;
      console.log(`  ${i + 1}. ${u.url}`);
      console.log(`     Verdict:     ${u.verdict.toUpperCase()} (Final Score: ${finalScore}, Heuristic: ${u.heuristic_score}, Intel: ${u.intel_score ?? 0})`);
      if (u.note) {
        console.log(`     Note:        ${u.note}`);
      }
      if (u.sources && Array.isArray(u.sources)) {
        console.log('     Sources:');
        u.sources.forEach((s) => {
          const detailStr = s.detail ? ` - ${s.detail}` : '';
          console.log(`       * ${s.name.padEnd(21)} [${s.status}]${detailStr}`);
        });
      }
      if (u.reasons?.length > 0) {
        console.log(`     Reasons:     ${u.reasons.join('; ')}`);
      }
    });
  }

  const threatIntel = data.threat_intel || data.extra?.threat_intel;
  if (threatIntel) {
    const reachable = threatIntel.sources_reachable?.length ? threatIntel.sources_reachable.join(', ') : 'none';
    const unavailable = threatIntel.sources_unavailable?.length ? threatIntel.sources_unavailable.join(', ') : 'none';
    console.log(`\nThreat Intel Coverage: ${threatIntel.coverage.toUpperCase()} (Checked: ${threatIntel.urls_checked}, Reachable: [${reachable}], Unavailable: [${unavailable}])`);
  }

  console.log('\n--- AI ANALYSIS ---');
  const ai = data.ai || data.extra?.ai;
  console.log(`Provider:     ${ai?.provider}`);
  console.log(`Tactics:      ${(ai?.patterns || []).join(', ') || '(none)'}`);
  console.log(`Summary:      ${ai?.summary_en}`);

  console.log('\n================================================================');
  console.log(` SUCCESS: Completed in ${elapsedMs} ms`);
  console.log('================================================================\n');
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
