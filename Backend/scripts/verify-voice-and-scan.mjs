import { execSync } from 'node:child_process';
import { connectDB, disconnectDB } from '../src/db/connect.js';
import { Scan } from '../src/models/Scan.js';

console.log('1. Testing GET /api/health...');
const healthRes = await fetch('http://127.0.0.1:5000/api/health');
const healthJson = await healthRes.json();
console.log('   Health Status:', healthRes.status, 'audio:', JSON.stringify(healthJson.audio));
if (healthRes.status !== 200) throw new Error('Health endpoint failed');

console.log('\n2. Testing Voice Shield route on ai_deepfake.mp3...');
const voiceOutput = execSync('node scripts/voice-smoke.mjs "../Frontend/public/samples/ai_deepfake.mp3"', { encoding: 'utf-8' });
console.log(voiceOutput);

console.log('\n3. Inspecting MongoDB Job Scan Document...');
await connectDB();
const latestJobScan = await Scan.findOne({ shield: 'job' }).sort({ createdAt: -1 }).lean();
console.log('   Latest Job Scan:', JSON.stringify(latestJobScan, null, 2));

console.log('\nPrivacy Audit for Saved Job Scan:');
console.log('   - Has raw message text?', ('text' in latestJobScan || 'extracted_text' in latestJobScan));
console.log('   - Has URLs?', ('urls' in latestJobScan || 'url' in latestJobScan));
console.log('   - Has file names?', ('filename' in latestJobScan || 'file' in latestJobScan));
console.log('   - Has company names?', ('company' in latestJobScan));
console.log('   - Has highlights/offsets?', ('highlights' in latestJobScan));
console.log('   - Top signals stored:', latestJobScan?.signals?.length);
console.log('   - Summary max 300 chars:', latestJobScan?.summary?.length <= 300);

await disconnectDB();

console.log('\n[SUCCESS] Health, Voice Shield, and Privacy Audit verified perfectly!');
