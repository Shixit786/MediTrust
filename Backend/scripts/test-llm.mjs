import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import {
  explain,
  explainJson,
  templateExplanation,
  getLlmStatus,
  _resetStateForTesting,
} from '../src/services/llm.service.js';
import { createApp } from '../src/app.js';

console.log('--- RUNNING LLM SERVICE UNIT & INTEGRATION TESTS ---');

// Test 1: getLlmStatus initial check
const initialStatus = getLlmStatus();
console.log('1. getLlmStatus():', JSON.stringify(initialStatus));
assert.ok('groq' in initialStatus, 'Status has groq');
assert.ok('nvidia' in initialStatus, 'Status has nvidia');

// Test 2: templateExplanation deterministic behavior
console.log('\n2. Testing templateExplanation:');
const t1 = templateExplanation({
  shield: 'voice',
  risk: 88,
  threat: 'deepfake voice cloning',
  signals: ['synthetic pitch regularity', 'phase anomaly', 'vocoder artifacts'],
});
console.log('High risk template:\n', t1);
assert.match(t1, /VOICE Shield/);
assert.match(t1, /deepfake voice cloning/);
assert.match(t1, /synthetic pitch regularity/);
assert.match(t1, /early warning, not proof/);

const tLow = templateExplanation({
  shield: 'job',
  level: 'low',
  signals: ['verified business domain'],
});
console.log('\nLow risk template:\n', tLow);
assert.match(tLow, /nominal telemetry indicators/);
assert.match(tLow, /early warning safeguard, not proof/);

// Test 3: explain() with no keys -> falls back to template
console.log('\n3. Testing explain() with no keys:');
_resetStateForTesting();
const res1 = await explain({
  system: 'Test system prompt',
  user: 'explain deepfake voice in 2 lines',
});
console.log('Result:', res1);
assert.equal(res1.provider, 'template');
assert.equal(res1.cached, false);
assert.ok(typeof res1.text === 'string' && res1.text.length > 0);

// Test 4: Repeated call -> returns cached: true
console.log('\n4. Testing caching:');
const res2 = await explain({
  system: 'Test system prompt',
  user: 'explain deepfake voice in 2 lines',
});
console.log('Cached result:', res2);
assert.equal(res2.cached, true);
assert.equal(res2.provider, 'template');
assert.equal(res2.latencyMs, 0);
assert.equal(res2.text, res1.text);

// Test 5: explainJson() with fallback
console.log('\n5. Testing explainJson() with schema fallback:');
const schema = z.object({
  riskScore: z.number(),
  summary: z.string(),
});
const fallbackObj = { riskScore: 0, summary: 'Deterministic fallback assessment' };
const jsonRes = await explainJson({
  system: 'Return JSON',
  user: 'Scan payload',
  schema,
  fallback: fallbackObj,
});
console.log('explainJson result:', jsonRes);
assert.deepEqual(jsonRes, fallbackObj);

// Test 6: HTTP Server Integration tests
console.log('\n6. Testing Express HTTP Endpoints:');
const app = createApp();
const server = app.listen(0);
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;

try {
  // Check /api/health
  const healthRes = await fetch(`${baseUrl}/api/health`);
  const healthData = await healthRes.json();
  console.log('GET /api/health response:', JSON.stringify(healthData, null, 2));
  assert.equal(healthRes.status, 200);
  assert.ok(healthData.llm, 'Health response includes llm field');
  assert.ok(healthData.llm.groq, 'groq status present');
  assert.ok(healthData.llm.nvidia, 'nvidia status present');

  // Verify healthData has NO secret keys or prompt text
  const healthStr = JSON.stringify(healthData);
  assert.ok(!healthStr.includes('gsk_'), 'No groq keys');
  assert.ok(!healthStr.includes('nvapi-'), 'No nvidia keys');

  // POST /api/test/llm
  _resetStateForTesting();
  const testRes1 = await fetch(`${baseUrl}/api/test/llm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'explain deepfake voice in 2 lines' }),
  });
  const testData1 = await testRes1.json();
  console.log('\nPOST /api/test/llm response 1:', testData1);
  assert.equal(testRes1.status, 200);
  assert.ok(testData1.text, 'Has text');
  assert.equal(testData1.cached, false);

  // Repeat POST /api/test/llm -> cached: true
  const testRes2 = await fetch(`${baseUrl}/api/test/llm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'explain deepfake voice in 2 lines' }),
  });
  const testData2 = await testRes2.json();
  console.log('POST /api/test/llm response 2 (repeat):', testData2);
  assert.equal(testRes2.status, 200);
  assert.equal(testData2.cached, true);
  assert.equal(testData2.latencyMs, 0);

  // Validation failure test (invalid body)
  const invalidRes = await fetch(`${baseUrl}/api/test/llm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: '' }),
  });
  console.log('Invalid body status code:', invalidRes.status);
  assert.equal(invalidRes.status, 400);

  console.log('\nALL TESTS PASSED SUCCESSFULLY!');
} finally {
  server.close();
}
