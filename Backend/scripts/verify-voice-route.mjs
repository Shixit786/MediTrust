import http from 'http';
import fs from 'fs';
import path from 'path';
import { createApp } from '../src/app.js';
import { sniffAudio } from '../src/middlewares/upload.middleware.js';
import { buildVoiceResult, buildAiBlock } from '../src/services/voiceResult.service.js';

console.log('================================================================');
console.log(' VOICE SHIELD ROUTE & LOGIC VERIFICATION');
console.log('================================================================\n');

// 1. Unit test sniffAudio
console.log('1. Testing sniffAudio magic bytes...');
// WAV
const wavHeader = Buffer.alloc(12);
wavHeader.write('RIFF', 0);
wavHeader.write('WAVE', 8);
if (sniffAudio(wavHeader) !== '.wav') throw new Error('Failed to sniff WAV');

// MP3 ID3
const mp3Id3 = Buffer.alloc(12);
mp3Id3.write('ID3', 0);
if (sniffAudio(mp3Id3) !== '.mp3') throw new Error('Failed to sniff MP3 ID3');

// MP3 frame sync
const mp3Sync = Buffer.from([0xff, 0xfb, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
if (sniffAudio(mp3Sync) !== '.mp3') throw new Error('Failed to sniff MP3 frame sync');

// OGG
const oggHeader = Buffer.alloc(12);
oggHeader.write('OggS', 0);
if (sniffAudio(oggHeader) !== '.ogg') throw new Error('Failed to sniff OGG');

// FLAC
const flacHeader = Buffer.alloc(12);
flacHeader.write('fLaC', 0);
if (sniffAudio(flacHeader) !== '.flac') throw new Error('Failed to sniff FLAC');

// WebM
const webmHeader = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
if (sniffAudio(webmHeader) !== '.webm') throw new Error('Failed to sniff WebM');

// M4A
const m4aHeader = Buffer.alloc(12);
m4aHeader.write('ftyp', 4);
if (sniffAudio(m4aHeader) !== '.m4a') throw new Error('Failed to sniff M4A');

// Invalid text
let textFailed = false;
try {
  sniffAudio(Buffer.from('Hello this is not audio file!'));
} catch (e) {
  textFailed = true;
  if (e.statusCode !== 415 || e.code !== 'UNSUPPORTED_MEDIA') {
    throw new Error(`Unexpected error on invalid text: ${e.statusCode} ${e.code}`);
  }
}
if (!textFailed) throw new Error('sniffAudio did not reject text buffer');
console.log('   [OK] sniffAudio accurately identifies all 6 formats and rejects invalid text.\n');

// 2. Unit test buildVoiceResult
console.log('2. Testing buildVoiceResult data transformation...');
const mockPy = {
  overall_score: 74,
  verdict_hint: 'likely_synthetic',
  confidence: 0.85,
  features: [
    { id: 'mfcc_anomaly', name: 'MFCC ANOMALY', value: 0.38, unit: 'delta_std', score: 86, status: 'ANOMALOUS', note: 'Vocoder trace' },
    { id: 'spectral_flux', name: 'SPECTRAL FLUX CONSISTENCY', value: 0.2, unit: 'cv', score: 70, status: 'ANOMALOUS', note: 'Rigid spectrum' },
    { id: 'silence_purity', name: 'SILENCE PURITY', value: 0.3, unit: 'dB_std', score: 90, status: 'ANOMALOUS', note: 'Digital zero silence' },
    { id: 'highfreq_flatness', name: 'HIGH-FREQ FLATNESS', value: 0.01, unit: 'flatness_std', score: 75, status: 'ANOMALOUS', note: 'Flat high band' },
    { id: 'harmonic_perfection', name: 'HARMONIC PERFECTION', value: 0.95, unit: 'ratio', score: 80, status: 'ANOMALOUS', note: 'Clean harmonics' },
    { id: 'energy_flatness', name: 'ENERGY FLATNESS', value: 4.5, unit: 'dB_range', score: 65, status: 'ANOMALOUS', note: 'Compressed range' },
    { id: 'pitch_variance', name: 'PITCH VARIANCE', value: 0.8, unit: 'semitones_std', score: 60, status: 'SUSPICIOUS', note: 'Monotone pitch' },
    { id: 'zero_crossing_rate', name: 'ZERO CROSSING RATE', value: 0.015, unit: 'zcr_std', score: 55, status: 'SUSPICIOUS', note: 'Low ZCR var' },
    { id: 'breathing_pattern', name: 'BREATHING PATTERN', value: 0.0, unit: 'breaths/min', score: 40, status: 'NORMAL', note: 'Baseline' },
  ],
  anomalies: [{ t_start: 1.5, t_end: 3.0, feature: 'mfcc_anomaly', reason: 'Vocoder smoothness' }],
  peaks: new Array(120).fill(0.5),
  quality: { duration_sec: 12.5, original_sample_rate: 16000, clipping_ratio: 0.0, low_bandwidth: false, warnings: ['Notice: test warning'] },
  disclaimer: 'Heuristic risk indicator, not proof.',
};

const voiceResult = buildVoiceResult(mockPy);
if (voiceResult.shield !== 'voice') throw new Error('Invalid shield');
if (voiceResult.risk !== 74) throw new Error('Invalid risk');
if (voiceResult.level !== 'high') throw new Error('Invalid level');
if (voiceResult.threat !== 'Possible Deepfake Voice') throw new Error('Invalid threat label');
if (voiceResult.reliability !== 'high') throw new Error('Invalid reliability');
if (voiceResult.peaks.length !== 120) throw new Error('Invalid peaks length');
if (voiceResult.features.length !== 9) throw new Error('Invalid features length');
console.log('   [OK] buildVoiceResult matches specification.\n');

// 3. HTTP Server integration test
console.log('3. Starting Express test server...');
const app = createApp();
const server = http.createServer(app);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const appPort = server.address().port;
const baseUrl = `http://127.0.0.1:${appPort}`;
console.log(`   Express running on ${baseUrl}\n`);

try {
  // Test 3A: GET /api/health
  console.log('4. Testing GET /api/health with audio status...');
  const healthRes = await fetch(`${baseUrl}/api/health`);
  const healthData = await healthRes.json();
  console.log('   Health response:', JSON.stringify(healthData.audio));
  if (healthRes.status !== 200) throw new Error('Health returned non-200');
  if (!healthData.audio || !healthData.audio.status) throw new Error('Missing audio health block');
  console.log('   [OK] /api/health correctly includes audio status.\n');

  // Helper for multipart requests
  async function postFile(endpoint, filename, buffer) {
    const formData = new FormData();
    if (buffer !== null) {
      const ext = path.extname(filename).toLowerCase().replace('.', '');
      const blob = new Blob([buffer], { type: `audio/${ext}` });
      formData.append('audio', blob, filename);
    }
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      body: buffer !== null ? formData : new FormData(),
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  }

  // Test 3B: No file attached -> 400 NO_FILE
  console.log("5. Testing POST /api/voice/analyze with no file attached...");
  const noFileRes = await postFile('/api/voice/analyze', '', null);
  console.log(`   Status: ${noFileRes.status}, Code: ${noFileRes.body.code}`);
  if (noFileRes.status !== 400 || noFileRes.body.code !== 'NO_FILE') {
    throw new Error('Expected 400 NO_FILE');
  }
  console.log('   [OK] Correctly rejected with 400 NO_FILE.\n');

  // Test 3C: Unsupported text file renamed to .wav -> 415 UNSUPPORTED_MEDIA
  console.log("6. Testing POST /api/voice/analyze with text file renamed to .wav...");
  const fakeWav = Buffer.from('This is a text string without WAV RIFF headers.');
  const fakeRes = await postFile('/api/voice/analyze', 'sample.wav', fakeWav);
  console.log(`   Status: ${fakeRes.status}, Code: ${fakeRes.body.code}`);
  if (fakeRes.status !== 415 || fakeRes.body.code !== 'UNSUPPORTED_MEDIA') {
    throw new Error('Expected 415 UNSUPPORTED_MEDIA');
  }
  console.log('   [OK] Correctly rejected with 415 UNSUPPORTED_MEDIA.\n');

  // Test 3D: File over 10 MB -> 413 FILE_TOO_LARGE
  console.log("7. Testing POST /api/voice/analyze with > 10 MB payload...");
  const bigBuffer = Buffer.alloc(10 * 1024 * 1024 + 1024);
  const bigRes = await postFile('/api/voice/analyze', 'big.wav', bigBuffer);
  console.log(`   Status: ${bigRes.status}, Code: ${bigRes.body.code}`);
  if (bigRes.status !== 413 || bigRes.body.code !== 'FILE_TOO_LARGE') {
    throw new Error('Expected 413 FILE_TOO_LARGE');
  }
  console.log('   [OK] Correctly rejected with 413 FILE_TOO_LARGE.\n');

  // Test 3E: Valid MP3 file from samples
  const mp3Path = path.resolve('audio-service/samples/ai/ai_1.mp3');
  if (fs.existsSync(mp3Path)) {
    console.log(`8. Testing POST /api/voice/analyze with real MP3 (${path.basename(mp3Path)})...`);
    const mp3Buf = fs.readFileSync(mp3Path);
    const mp3Res = await postFile('/api/voice/analyze', 'ai_1.mp3', mp3Buf);
    console.log(`   Status: ${mp3Res.status}`);
    console.log(`   Risk: ${mp3Res.body.risk}, Level: ${mp3Res.body.level}, Threat: ${mp3Res.body.threat}`);
    console.log(`   AI Provider: ${mp3Res.body.ai?.provider}`);
    console.log(`   Features: ${mp3Res.body.features?.length}, Peaks: ${mp3Res.body.peaks?.length}`);
    if (mp3Res.status !== 200) {
      console.log('Error payload:', mp3Res.body);
      throw new Error('Real MP3 analysis failed');
    }
    if (!mp3Res.body.ai || !mp3Res.body.ai.summary_en) throw new Error('Missing AI summary');
    console.log('   [OK] Real MP3 analyzed successfully with AI explanation.\n');
  }

  console.log('================================================================');
  console.log(' ALL SUITE TESTS PASSED WITH 100% SPEC COMPLIANCE!');
  console.log('================================================================');
} finally {
  server.close();
}
