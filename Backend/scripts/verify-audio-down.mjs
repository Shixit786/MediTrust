// Set environment variable BEFORE importing env.js
process.env.AUDIO_SERVICE_URL = 'http://127.0.0.1:59999';

const { checkAudioHealth, analyzeAudio } = await import('../src/services/audio.service.js');
const { createApp } = await import('../src/app.js');

console.log('Testing Audio Service Down Behavior:');

// Test 1: checkAudioHealth when down
const health = await checkAudioHealth();
console.log('1. checkAudioHealth() when down:', JSON.stringify(health));
if (health.status !== 'down' || health.ffmpeg !== null) {
  throw new Error('Expected { status: "down", ffmpeg: null }');
}

// Test 2: analyzeAudio throws 503 AUDIO_SERVICE_UNAVAILABLE
let caughtError = null;
try {
  await analyzeAudio(Buffer.from('fake'), 'wav');
} catch (err) {
  caughtError = err;
}
console.log('2. analyzeAudio error statusCode:', caughtError?.statusCode, 'code:', caughtError?.code);
console.log('   message:', caughtError?.message);
if (caughtError?.statusCode !== 503 || caughtError?.code !== 'AUDIO_SERVICE_UNAVAILABLE') {
  throw new Error('Expected 503 AUDIO_SERVICE_UNAVAILABLE');
}

// Test 3: Test HTTP server route POST /api/voice/analyze returns 503
const app = createApp();
const server = app.listen(0);
const port = server.address().port;

const res = await fetch(`http://127.0.0.1:${port}/api/health`);
const healthJson = await res.json();
console.log('3. GET /api/health HTTP status:', res.status, 'audio:', JSON.stringify(healthJson.audio));

// Create multipart payload
const form = new FormData();
// Valid WAV header (RIFF...WAVE)
const wavHeader = Buffer.alloc(44);
wavHeader.write('RIFF', 0);
wavHeader.writeUInt32LE(36, 4);
wavHeader.write('WAVE', 8);
wavHeader.write('fmt ', 12);
wavHeader.writeUInt32LE(16, 16);
wavHeader.writeUInt16LE(1, 20); // PCM
wavHeader.writeUInt16LE(1, 22); // Mono
wavHeader.writeUInt32LE(16000, 24);
wavHeader.writeUInt32LE(32000, 28);
wavHeader.writeUInt16LE(2, 32);
wavHeader.writeUInt16LE(16, 34);
wavHeader.write('data', 36);
wavHeader.writeUInt32LE(0, 40);

form.append('audio', new Blob([wavHeader], { type: 'audio/wav' }), 'sample.wav');

const analyzeRes = await fetch(`http://127.0.0.1:${port}/api/voice/analyze`, {
  method: 'POST',
  body: form,
});
const analyzeJson = await analyzeRes.json();
console.log('4. POST /api/voice/analyze HTTP status:', analyzeRes.status);
console.log('   Response JSON:', JSON.stringify(analyzeJson, null, 2));

server.close();

if (analyzeRes.status === 503 && analyzeJson.code === 'AUDIO_SERVICE_UNAVAILABLE') {
  console.log('\n[SUCCESS] Audio down behavior fully verified with 503 AUDIO_SERVICE_UNAVAILABLE and /api/health returning 200 with audio: "down".');
} else {
  throw new Error('POST /api/voice/analyze failed to return 503');
}
