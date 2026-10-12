const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('=== RUNNING MEDITRUST BACKEND VERIFICATION SUITE ===\n');

  // Test 1: GET /api/health
  console.log('--- Test 1: GET /api/health ---');
  const resHealth = await fetch(`${BASE_URL}/api/health`);
  const dataHealth = await resHealth.json();
  console.log(`Status: ${resHealth.status}`);
  console.log('Response:', JSON.stringify(dataHealth, null, 2));

  // Test 2: GET /api/nope (404 NOT_FOUND)
  console.log('\n--- Test 2: GET /api/nope (404 NOT_FOUND) ---');
  const resNotFound = await fetch(`${BASE_URL}/api/nope`);
  const dataNotFound = await resNotFound.json();
  console.log(`Status: ${resNotFound.status}`);
  console.log('Response:', JSON.stringify(dataNotFound, null, 2));

  // Test 3: POST /api/job/analyze (501 NOT_IMPLEMENTED)
  console.log('\n--- Test 3: POST /api/job/analyze (501 NOT_IMPLEMENTED) ---');
  const resNotImplemented = await fetch(`${BASE_URL}/api/job/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const dataNotImplemented = await resNotImplemented.json();
  console.log(`Status: ${resNotImplemented.status}`);
  console.log('Response:', JSON.stringify(dataNotImplemented, null, 2));

  // Test 4: POST /api/health with invalid JSON (400 INVALID_JSON)
  console.log('\n--- Test 4: POST /api/health with invalid JSON (400 INVALID_JSON) ---');
  const resBadJson = await fetch(`${BASE_URL}/api/health`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"invalid": json_without_quotes',
  });
  const dataBadJson = await resBadJson.json();
  console.log(`Status: ${resBadJson.status}`);
  console.log('Response:', JSON.stringify(dataBadJson, null, 2));

  // Test 5: Body larger than 1MB (413 PAYLOAD_TOO_LARGE)
  console.log('\n--- Test 5: Body larger than 1MB (413 PAYLOAD_TOO_LARGE) ---');
  const largeString = 'x'.repeat(1.2 * 1024 * 1024); // 1.2 MB
  const resLarge = await fetch(`${BASE_URL}/api/voice/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: largeString }),
  });
  const dataLarge = await resLarge.json();
  console.log(`Status: ${resLarge.status}`);
  console.log('Response:', JSON.stringify(dataLarge, null, 2));

  // Test 6: CORS checks
  console.log('\n--- Test 6: CORS checks ---');
  const resCorsAllowed = await fetch(`${BASE_URL}/api/health`, {
    headers: { Origin: 'http://localhost:5173' },
  });
  console.log('Origin http://localhost:5173 Access-Control-Allow-Origin header:', resCorsAllowed.headers.get('access-control-allow-origin'));

  const resCorsBlocked = await fetch(`${BASE_URL}/api/health`, {
    headers: { Origin: 'http://evil.example' },
  });
  console.log('Origin http://evil.example Access-Control-Allow-Origin header:', resCorsBlocked.headers.get('access-control-allow-origin'));

  // Test 7: Phone number masking in path
  console.log('\n--- Test 7: Phone masking in path query ---');
  const resSim = await fetch(`${BASE_URL}/api/sim/9876543210`);
  console.log(`Status: ${resSim.status}`);

  // Test 8: Rate Limiting (130 quick requests)
  console.log('\n--- Test 8: Rate Limiting (130 quick requests to /api/sim/reset) ---');
  let rateLimitedHit = false;
  let lastStatus = 0;
  let lastData = null;
  let retryAfterHeader = null;

  for (let i = 0; i < 130; i++) {
    const res = await fetch(`${BASE_URL}/api/sim/reset`, { method: 'POST' });
    lastStatus = res.status;
    if (res.status === 429) {
      rateLimitedHit = true;
      lastData = await res.json();
      retryAfterHeader = res.headers.get('retry-after');
      break;
    }
  }
  console.log(`Rate limit triggered: ${rateLimitedHit}`);
  console.log(`Status: ${lastStatus}`);
  console.log(`Retry-After Header: ${retryAfterHeader}`);
  console.log('Response:', JSON.stringify(lastData, null, 2));

  console.log('\n=== ALL ENDPOINT CHECKS COMPLETE ===');
}

runTests().catch(console.error);
