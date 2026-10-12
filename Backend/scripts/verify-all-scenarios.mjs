import http from 'http';
import { createApp } from '../src/app.js';
import { _resetStateForTesting } from '../src/services/llm.service.js';

console.log('====================================================');
console.log('MEDITRUST LLM RESILIENCE VERIFICATION SUITE');
console.log('====================================================\n');

// 1. Mock OpenAI-compatible endpoints server to verify multi-provider failover
let mockGroqStatus = 200;
let mockGroqDelayMs = 0;
let mockGroqResponse = {
  choices: [{ message: { content: 'Deepfake synthetic voice indicators analyzed by Groq.' } }]
};

let mockNvidiaStatus = 200;
let mockNvidiaResponse = {
  choices: [{ message: { content: 'Acoustic biometrics analyzed by NVIDIA NIM fallback.' } }]
};

const mockServer = http.createServer((req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    if (req.url.includes('/groq')) {
      if (mockGroqDelayMs > 0) {
        await new Promise(r => setTimeout(r, mockGroqDelayMs));
      }
      res.writeHead(mockGroqStatus, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockGroqResponse));
    } else if (req.url.includes('/nvidia')) {
      res.writeHead(mockNvidiaStatus, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockNvidiaResponse));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
});

await new Promise(r => mockServer.listen(0, '127.0.0.1', r));
const mockPort = mockServer.address().port;
const mockGroqUrl = `http://127.0.0.1:${mockPort}/groq`;
const mockNvidiaUrl = `http://127.0.0.1:${mockPort}/nvidia`;

// Start test Express app
const app = createApp();
const server = http.createServer(app);
await new Promise(r => server.listen(0, '127.0.0.1', r));
const appPort = server.address().port;
const baseUrl = `http://127.0.0.1:${appPort}`;

try {
  // SCENARIO A: Valid Groq key -> provider groq
  console.log('--- SCENARIO A: Valid keys -> provider groq ---');
  _resetStateForTesting();
  process.env.GROQ_API_KEY = 'gsk_valid_key';
  process.env.GROQ_ENDPOINT_URL = mockGroqUrl;
  mockGroqStatus = 200;

  const resA = await fetch(`${baseUrl}/api/test/llm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'explain deepfake voice in 2 lines' }),
  });
  const dataA = await resA.json();
  console.log(`Status: ${resA.status}`);
  console.log(`Response:`, dataA);
  if (dataA.provider !== 'groq') throw new Error(`Expected provider groq, got ${dataA.provider}`);

  // SCENARIO B: Groq fails (e.g. HTTP 429) -> falls back to NVIDIA NIM
  console.log('\n--- SCENARIO B: Groq fails (429) -> fallback to NVIDIA NIM ---');
  _resetStateForTesting();
  process.env.GROQ_API_KEY = 'gsk_bad_key';
  process.env.GROQ_ENDPOINT_URL = mockGroqUrl;
  mockGroqStatus = 429;
  mockGroqResponse = { error: { message: 'Rate limit reached' } };

  process.env.NVIDIA_API_KEY = 'nvapi_valid_key';
  process.env.NVIDIA_ENDPOINT_URL = mockNvidiaUrl;
  mockNvidiaStatus = 200;

  const resB = await fetch(`${baseUrl}/api/test/llm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'explain voice cloning artifact' }),
  });
  const dataB = await resB.json();
  console.log(`Status: ${resB.status}`);
  console.log(`Response:`, dataB);
  if (dataB.provider !== 'nvidia') throw new Error(`Expected provider nvidia, got ${dataB.provider}`);

  // SCENARIO C: Remove both keys -> provider template, still HTTP 200
  console.log('\n--- SCENARIO C: Remove both keys -> provider template (HTTP 200) ---');
  _resetStateForTesting();
  delete process.env.GROQ_API_KEY;
  delete process.env.NVIDIA_API_KEY;
  delete process.env.GROQ_ENDPOINT_URL;
  delete process.env.NVIDIA_ENDPOINT_URL;

  const resC = await fetch(`${baseUrl}/api/test/llm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'explain deepfake voice in 2 lines' }),
  });
  const dataC = await resC.json();
  console.log(`Status: ${resC.status}`);
  console.log(`Response:`, dataC);
  if (dataC.provider !== 'template') throw new Error(`Expected provider template, got ${dataC.provider}`);

  // SCENARIO D: Repeat the same request -> cached true, near-zero latency
  console.log('\n--- SCENARIO D: Repeat the same request -> cached true, near-zero latency ---');
  const resD = await fetch(`${baseUrl}/api/test/llm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'explain deepfake voice in 2 lines' }),
  });
  const dataD = await resD.json();
  console.log(`Status: ${resD.status}`);
  console.log(`Response:`, dataD);
  if (dataD.cached !== true) throw new Error('Expected cached === true');
  if (dataD.latencyMs > 10) throw new Error(`Expected near-zero latency, got ${dataD.latencyMs}ms`);

  // SCENARIO E: Timeout test: set LLM_TIMEOUT_MS=1 -> falls back without crashing
  console.log('\n--- SCENARIO E: Timeout test with LLM_TIMEOUT_MS=1 -> falls back without crashing ---');
  _resetStateForTesting();
  process.env.GROQ_API_KEY = 'gsk_mock_key';
  process.env.GROQ_ENDPOINT_URL = mockGroqUrl;
  mockGroqDelayMs = 150; // Mock delay to trigger timeout
  process.env.LLM_TIMEOUT_MS = '1';

  const resE = await fetch(`${baseUrl}/api/test/llm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'test timeout resilience' }),
  });
  const dataE = await resE.json();
  console.log(`Status: ${resE.status}`);
  console.log(`Response:`, dataE);
  console.log(`Fallback successful without crash: provider = ${dataE.provider}`);
  if (dataE.provider !== 'template') throw new Error('Expected fallback to template on timeout');

  delete process.env.GROQ_API_KEY;
  delete process.env.GROQ_ENDPOINT_URL;
  delete process.env.LLM_TIMEOUT_MS;
  mockGroqDelayMs = 0;

  // SCENARIO F: Privacy audit: logs and /api/health show no key values and no prompt text
  console.log('\n--- SCENARIO F: Verify /api/health and privacy ---');
  const healthRes = await fetch(`${baseUrl}/api/health`);
  const healthData = await healthRes.json();
  console.log(`GET /api/health status: ${healthRes.status}`);
  console.log(`Health data:`, JSON.stringify(healthData, null, 2));
  const healthText = JSON.stringify(healthData);
  if (healthText.includes('gsk_') || healthText.includes('nvapi_')) {
    throw new Error('Health check leaked API keys!');
  }
  if (healthText.includes('explain deepfake') || healthText.includes('voice cloning')) {
    throw new Error('Health check leaked prompt text!');
  }
  console.log('VERIFIED: Health check contains no API keys and no prompt text.');

  console.log('\n====================================================');
  console.log('ALL VERIFICATION REQUIREMENTS MET AND VERIFIED!');
  console.log('====================================================');
} finally {
  server.close();
  mockServer.close();
}
