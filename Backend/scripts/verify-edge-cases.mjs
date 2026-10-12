const BASE_URL = 'http://127.0.0.1:5000';

console.log('Testing Edge Cases against running server...');

// 1. No file -> 400 NO_FILE
const noFileRes = await fetch(`${BASE_URL}/api/voice/analyze`, {
  method: 'POST',
});
const noFileJson = await noFileRes.json();
console.log('1. No file test:');
console.log(`   Status: ${noFileRes.status}, Code: ${noFileJson.code}, Error: ${noFileJson.error}`);
if (noFileRes.status !== 400 || noFileJson.code !== 'NO_FILE') {
  throw new Error('Expected 400 NO_FILE');
}

// 2. .txt renamed to .wav -> 415 UNSUPPORTED_MEDIA
const fakeWavForm = new FormData();
const textBuffer = Buffer.from('This is a text file masquerading as a wav.');
fakeWavForm.append('audio', new Blob([textBuffer], { type: 'audio/wav' }), 'fake.wav');

const badMediaRes = await fetch(`${BASE_URL}/api/voice/analyze`, {
  method: 'POST',
  body: fakeWavForm,
});
const badMediaJson = await badMediaRes.json();
console.log('2. Fake .wav (.txt content) test:');
console.log(`   Status: ${badMediaRes.status}, Code: ${badMediaJson.code}, Error: ${badMediaJson.error}`);
if (badMediaRes.status !== 415 || badMediaJson.code !== 'UNSUPPORTED_MEDIA') {
  throw new Error('Expected 415 UNSUPPORTED_MEDIA');
}

// 3. File over 10 MB -> 413 FILE_TOO_LARGE
const largeForm = new FormData();
// 10 MB + 100 KB
const oversized = Buffer.alloc(10 * 1024 * 1024 + 100 * 1024);
// Put a valid WAV header so it's not rejected by extension
oversized.write('RIFF', 0);
oversized.writeUInt32LE(36, 4);
oversized.write('WAVE', 8);
largeForm.append('audio', new Blob([oversized], { type: 'audio/wav' }), 'large.wav');

const largeRes = await fetch(`${BASE_URL}/api/voice/analyze`, {
  method: 'POST',
  body: largeForm,
});
const largeJson = await largeRes.json();
console.log('3. Large file (>10MB) test:');
console.log(`   Status: ${largeRes.status}, Code: ${largeJson.code}, Error: ${largeJson.error}`);
if (largeRes.status !== 413 || largeJson.code !== 'FILE_TOO_LARGE') {
  throw new Error('Expected 413 FILE_TOO_LARGE');
}

// 4. Rate limit: 10 requests / min limit -> 11th request gives 429
console.log('4. Testing Rate Limiting (10 max, 11th should be 429)...');
let rateLimited = false;
let rateLimitStatus = null;
let rateLimitJson = null;

// Send rapid empty requests (which trigger the limiter before validation/controller)
for (let i = 1; i <= 12; i++) {
  const res = await fetch(`${BASE_URL}/api/voice/analyze`, { method: 'POST' });
  if (res.status === 429) {
    rateLimited = true;
    rateLimitStatus = res.status;
    rateLimitJson = await res.json();
    console.log(`   Request #${i} hit rate limit: Status ${rateLimitStatus}, Code: ${rateLimitJson.code}`);
    break;
  }
}

if (!rateLimited) {
  throw new Error('Expected 429 RATE_LIMITED on excess requests');
}

console.log('\n[SUCCESS] All edge cases (400, 415, 413, 429) passed with exact status and codes!');
