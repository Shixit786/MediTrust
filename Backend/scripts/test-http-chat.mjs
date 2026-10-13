import { createApp } from '../src/app.js';
import http from 'node:http';

const PORT = 5055;

async function run() {
  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Test server running on port ${PORT}`);

  try {
    // 1. Test 600-char message -> 400 VALIDATION_ERROR
    const longMsg = 'A'.repeat(600);
    const res400 = await fetch(`http://localhost:${PORT}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: longMsg }],
      }),
    });
    console.log(`Long message test status: ${res400.status} (expected 400)`);
    const data400 = await res400.json();
    console.log(`400 error code: ${data400.error?.code || data400.code}`);

    // 2. Test valid message -> 200 OK
    const res200 = await fetch(`http://localhost:${PORT}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'I shared my OTP' }],
      }),
    });
    console.log(`Valid OTP message status: ${res200.status} (expected 200)`);
    const data200 = await res200.json();
    console.log(`200 source: ${data200.source}`);

    // 3. Test rate limiting: send requests until rate limit triggered (limit is 20 / minute)
    console.log('Sending requests to test 20 req/min rate limit...');
    let hitRateLimit = false;
    let rateLimitStatus = 0;
    for (let i = 2; i <= 25; i++) {
      const res = await fetch(`http://localhost:${PORT}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'hello' }],
        }),
      });
      if (res.status === 429) {
        hitRateLimit = true;
        rateLimitStatus = res.status;
        console.log(`Request #${i} returned ${res.status} Too Many Requests (expected 429)`);
        break;
      }
    }
    console.log(`Rate limit reached: ${hitRateLimit} with status ${rateLimitStatus}`);

  } finally {
    await new Promise((resolve) => server.close(resolve));
    console.log(`Test server on port ${PORT} closed.`);
  }
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
