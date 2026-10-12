import { z } from 'zod';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

const pyResponseSchema = z.object({
  overall_score: z.number().int().min(0).max(100),
  verdict_hint: z.string(),
  confidence: z.number().min(0).max(1),
  features: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        value: z.number(),
        unit: z.string(),
        score: z.number().int().min(0).max(100),
        status: z.enum(['NORMAL', 'SUSPICIOUS', 'ANOMALOUS']),
        note: z.string(),
      })
    )
    .length(9),
  anomalies: z.array(
    z.object({
      t_start: z.number(),
      t_end: z.number(),
      feature: z.string(),
      reason: z.string(),
    })
  ),
  peaks: z.array(z.number().min(0).max(1)).length(120),
  quality: z.object({
    duration_sec: z.number(),
    original_sample_rate: z.number(),
    clipping_ratio: z.number(),
    low_bandwidth: z.boolean(),
    warnings: z.array(z.string()),
  }),
  disclaimer: z.string(),
});

let cachedHealth = null;
let lastHealthCheck = 0;

/**
 * Checks connectivity to the upstream Python audio service with a 1500 ms timeout.
 * Cached for 10 seconds. Never throws.
 *
 * @returns {Promise<{ status: 'up' | 'down', ffmpeg: boolean | null }>}
 */
export async function checkAudioHealth() {
  const now = Date.now();
  if (cachedHealth && now - lastHealthCheck < 10000) {
    return cachedHealth;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);

  try {
    const res = await fetch(`${env.AUDIO_SERVICE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    if (res.ok) {
      const data = await res.json();
      const result = {
        status: 'up',
        ffmpeg: typeof data?.ffmpeg === 'boolean' ? data.ffmpeg : null,
      };
      cachedHealth = result;
      lastHealthCheck = now;
      return result;
    }
  } catch {
    // Network failure or timeout -> upstream service is down
  } finally {
    clearTimeout(timer);
  }

  const downResult = { status: 'down', ffmpeg: null };
  cachedHealth = downResult;
  lastHealthCheck = now;
  return downResult;
}

/**
 * Forwards an audio buffer to the Python microservice for acoustic analysis.
 * Uses a generic file name ("audio.<ext>") for privacy.
 *
 * @param {Buffer} buffer Uploaded file buffer
 * @param {string} ext Extension (e.g. '.wav', '.mp3')
 * @returns {Promise<z.infer<typeof pyResponseSchema>>} Validated analysis payload
 */
export async function analyzeAudio(buffer, ext) {
  const cleanExt = ext.startsWith('.') ? ext.slice(1) : ext;
  const genericFilename = `audio.${cleanExt}`;

  const blob = new Blob([buffer], { type: `audio/${cleanExt}` });
  const formData = new FormData();
  formData.append('file', blob, genericFilename);

  const timeoutMs = env.AUDIO_SERVICE_TIMEOUT_MS || 25000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${env.AUDIO_SERVICE_URL}/analyze`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError' || controller.signal.aborted) {
      throw new ApiError(504, 'AUDIO_SERVICE_TIMEOUT', 'Voice analysis service timed out');
    }
    logger.warn('Failed to connect to Python audio service:', err.message);
    throw new ApiError(
      503,
      'AUDIO_SERVICE_UNAVAILABLE',
      'Voice analysis service is not running. Start it with npm run dev:audio.'
    );
  } finally {
    clearTimeout(timer);
  }

  // Handle non-2xx responses from Python service
  if (!res.ok) {
    let errorJson = null;
    try {
      errorJson = await res.json();
    } catch {
      // response body was not valid JSON
    }

    const message = errorJson?.error || `Audio service returned HTTP ${res.status}`;
    const code = errorJson?.code || (res.status === 503 ? 'BUSY' : 'AUDIO_SERVICE_ERROR');

    if ([413, 415, 422, 503].includes(res.status)) {
      throw new ApiError(res.status, code, message);
    }

    throw new ApiError(502, 'AUDIO_SERVICE_ERROR', message);
  }

  // Parse JSON body
  let data;
  try {
    data = await res.json();
  } catch {
    throw new ApiError(502, 'AUDIO_SERVICE_ERROR', 'Audio service returned malformed JSON response');
  }

  // Validate response contract with Zod
  const validation = pyResponseSchema.safeParse(data);
  if (!validation.success) {
    logger.warn('Audio service response contract violation:', validation.error.message);
    throw new ApiError(502, 'BAD_AUDIO_RESPONSE', 'Audio service returned an invalid response structure');
  }

  return validation.data;
}

export default {
  analyzeAudio,
  checkAudioHealth,
};
