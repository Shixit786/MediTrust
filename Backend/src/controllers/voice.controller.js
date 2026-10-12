import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { ok } from '../utils/response.js';
import { saveScan } from '../utils/saveScan.js';
import { sniffAudio } from '../middlewares/upload.middleware.js';
import { analyzeAudio } from '../services/audio.service.js';
import {
  buildVoiceResult,
  buildAiBlock,
  extractPatterns,
} from '../services/voiceResult.service.js';
import { explain } from '../services/llm.service.js';

const VOICE_EXPLAIN_SYSTEM =
  'You explain the output of a heuristic voice analysis for a fraud early-warning app. You get numeric measurements, not audio. In at most 90 words, say what the strongest cues suggest, state clearly that this is a risk indicator and not proof, that a low score does not guarantee a real voice, and end with one safe next step (verify through another channel, never share an OTP). English only. Do not invent measurements.';

export const analyzeVoice = asyncHandler(async (req, res) => {
  const startTime = Date.now();

  // 1. Validate file presence
  if (!req.file || !req.file.buffer) {
    throw ApiError.badRequest("Attach an audio file in the 'audio' field", 'NO_FILE');
  }

  // 2. Sniff real binary magic bytes
  const ext = sniffAudio(req.file.buffer);

  // 3. Forward to Python microservice
  const pyStart = Date.now();
  const pyResult = await analyzeAudio(req.file.buffer, ext);
  const pyLatencyMs = Date.now() - pyStart;

  // 4. Transform into standardized shield result
  const result = buildVoiceResult(pyResult);

  // 5. Generate AI explanation via LLM layer (Groq -> NVIDIA -> template)
  const flaggedTop3 = (result.signals || [])
    .filter((s) => s.name !== 'NO STRONG CUES' && s.name !== 'AUDIO QUALITY')
    .slice(0, 3)
    .map((s) => `- ${s.name} (${s.severity}): ${s.detail}`)
    .join('\n');

  const warnings = (result.quality?.warnings || [])
    .slice(0, 2)
    .map((w) => `- Notice: ${w}`)
    .join('\n');

  const userPrompt = [
    `Risk Score: ${result.risk}/100 (${result.level} risk)`,
    `Threat Assessment: ${result.threat}`,
    `Confidence: ${result.confidence} (${result.reliability} reliability)`,
    `Duration: ${result.duration_sec}s`,
    flaggedTop3 ? `Top flagged indicators:\n${flaggedTop3}` : 'No suspicious acoustic anomalies flagged.',
    warnings ? `Quality notices:\n${warnings}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const llmExplanation = await explain({
    system: VOICE_EXPLAIN_SYSTEM,
    user: userPrompt,
    shield: 'voice',
    risk: result.risk,
    level: result.level,
    threat: result.threat,
    signals: result.signals,
  });

  // 6. Build AI block
  const patterns = extractPatterns(result.features);
  const ai = buildAiBlock({
    summary: llmExplanation.text,
    patterns,
    confidence: result.confidence,
    provider: llmExplanation.provider,
  });
  result.ai = ai;

  // 7. Fire-and-forget saveScan (never awaited, never throws, stores only telemetry summary)
  saveScan({
    shield: 'voice',
    risk: result.risk,
    level: result.level,
    threat: result.threat,
    signals: (result.signals || []).slice(0, 5),
    summary: (ai.summary_en || '').slice(0, 300),
  }).catch(() => {});

  // 8. Log performance telemetry (size in KB, duration, latencies, provider - NEVER file names or audio)
  const sizeKb = Math.round(req.file.buffer.length / 1024);
  const totalMs = Date.now() - startTime;
  logger.info(
    `[Voice Shield] size=${sizeKb}KB duration=${result.duration_sec}s pyLatencyMs=${pyLatencyMs} llmProvider=${ai.provider} totalMs=${totalMs}`
  );

  return ok(res, result);
});

export default {
  analyzeVoice,
};
