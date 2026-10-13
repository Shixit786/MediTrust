import { execSync } from 'node:child_process';

const samples = ['1', '2', '3', '4', '5', '6', '7', 'pdf'];

console.log('================================================================');
console.log(' RUNNING JOB SHIELD SMOKE TESTS FOR ALL SAMPLES (1-7 + PDF)');
console.log('================================================================\n');

for (const s of samples) {
  try {
    const out = execSync(`node scripts/job-smoke.mjs --sample ${s}`, { encoding: 'utf-8' });
    console.log(out);
  } catch (err) {
    console.error(`Error running sample ${s}:`, err.stdout || err.message);
  }
}
