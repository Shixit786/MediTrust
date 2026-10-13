#!/usr/bin/env node

/**
 * intel-check.mjs - Standalone CLI tool to run threat intelligence orchestrator
 * on a single URL without going through the Express HTTP server.
 *
 * Usage:
 *   node scripts/intel-check.mjs --url "<url>"
 */

import { evaluateUrlHeuristics } from '../src/services/urlTools.js';
import { enrichUrls } from '../src/services/intel/intel.service.js';

function parseArgs() {
  const args = process.argv.slice(2);
  let targetUrl = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      targetUrl = args[++i];
    }
  }

  return { targetUrl };
}

async function run() {
  const { targetUrl } = parseArgs();

  if (!targetUrl) {
    console.log(`
Usage:
  node scripts/intel-check.mjs --url "<target-url>"

Example:
  node scripts/intel-check.mjs --url "https://example.com"
`);
    process.exit(1);
  }

  let parsedHost = 'unknown';
  try {
    const parsed = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
    parsedHost = parsed.hostname;
  } catch {
    // Keep unknown
  }

  console.log('================================================================');
  console.log(` THREAT INTELLIGENCE DIRECT CHECK: ${targetUrl}`);
  console.log('================================================================\n');

  const start = performance.now();
  const initial = evaluateUrlHeuristics(targetUrl, parsedHost);
  const [enriched] = await enrichUrls([initial]);
  const elapsedMs = Math.round(performance.now() - start);

  if (!enriched) {
    console.error('Error: Failed to evaluate target URL');
    process.exit(1);
  }

  const finalScore = enriched.final_score !== undefined ? enriched.final_score : enriched.heuristic_score;
  console.log(`Verdict:     ${enriched.verdict.toUpperCase()}`);
  console.log(`Final Score: ${finalScore}/100 (Heuristic: ${enriched.heuristic_score}, Intel: ${enriched.intel_score ?? 0})`);
  console.log(`Checked:     ${enriched.sources_checked ?? 0} sources reachable, ${enriched.sources_unavailable ?? 0} unavailable`);
  if (enriched.note) {
    console.log(`Note:        ${enriched.note}`);
  }

  console.log('\nSources Evaluation:');
  if (Array.isArray(enriched.sources)) {
    enriched.sources.forEach((s) => {
      const detailStr = s.detail ? ` - ${s.detail}` : '';
      console.log(`  * ${s.name.padEnd(21)} [${s.status}]${detailStr}`);
    });
  }

  if (enriched.reasons?.length > 0) {
    console.log('\nFlagged Reasons:');
    enriched.reasons.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r}`);
    });
  }

  console.log('\n================================================================');
  console.log(` Completed in ${elapsedMs} ms`);
  console.log('================================================================\n');
}

run().catch((err) => {
  console.error('Fatal error during intel check:', err);
  process.exit(1);
});
