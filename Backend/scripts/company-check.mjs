#!/usr/bin/env node

/**
 * company-check.mjs - Standalone CLI tool to run company verification directly.
 *
 * Usage:
 *   node scripts/company-check.mjs --name "<name>" [--domain "<domain>"]
 *
 * Example:
 *   node scripts/company-check.mjs --name "Apollo Hospitals" --domain "apollohospitals.com"
 *   node scripts/company-check.mjs --name "Apolo Hospitals" --domain "gmail.com"
 */

import { verifyCompany } from '../src/services/company/company.service.js';

function parseArgs() {
  const args = process.argv.slice(2);
  let name = null;
  let domain = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      name = args[++i];
    } else if (args[i] === '--domain' && args[i + 1]) {
      domain = args[++i];
    }
  }

  return { name, domain };
}

async function run() {
  const { name, domain } = parseArgs();

  if (!name) {
    console.log(`
Usage:
  node scripts/company-check.mjs --name "<company-name>" [--domain "<domain>"]

Example:
  node scripts/company-check.mjs --name "Apollo Hospitals" --domain "apollohospitals.com"
  node scripts/company-check.mjs --name "Apolo Hospitals" --domain "gmail.com"
`);
    process.exit(1);
  }

  console.log('================================================================');
  console.log(` COMPANY DIRECT VERIFICATION: ${name}`);
  if (domain) {
    console.log(` Contact Domain: ${domain}`);
  }
  console.log('================================================================\n');

  const start = performance.now();
  const contactDomains = domain ? [domain] : [];
  const result = await verifyCompany({ name, contactDomains });
  const elapsedMs = Math.round(performance.now() - start);

  console.log(`Company Name:  ${result.name ?? '(null)'}`);
  console.log(`Company Score: ${result.company_score}/100`);
  console.log(`Note:          ${result.note}`);

  console.log('\nChecks Evaluation:');
  if (Array.isArray(result.checks)) {
    result.checks.forEach((c) => {
      const detailStr = c.detail ? ` - ${c.detail}` : '';
      console.log(`  * ${c.name.padEnd(23)} [${c.status}]${detailStr}`);
    });
  }

  console.log('\n================================================================');
  console.log(` Completed in ${elapsedMs} ms`);
  console.log('================================================================\n');
}

run().catch((err) => {
  console.error('Fatal error during company check:', err);
  process.exit(1);
});
