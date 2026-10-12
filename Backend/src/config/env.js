import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Helper to treat empty strings or whitespace-only strings as undefined
const emptyToUndefined = (val) => {
  if (typeof val === 'string' && val.trim() === '') {
    return undefined;
  }
  return val;
};

const envSchema = z.object({
  NODE_ENV: z.preprocess(emptyToUndefined, z.enum(['development', 'production', 'test']).default('development')),
  PORT: z.preprocess((val) => {
    const v = emptyToUndefined(val);
    if (v === undefined) return 5000;
    const parsed = parseInt(String(v), 10);
    return isNaN(parsed) ? v : parsed;
  }, z.number().int().positive().default(5000)),
  MONGODB_URI: z.preprocess(emptyToUndefined, z.string().optional()),
  CLIENT_ORIGIN: z.preprocess(
    emptyToUndefined,
    z.string().default('http://localhost:5173,http://localhost:4173')
  ),
  DEMO_MODE: z.preprocess((val) => {
    const v = emptyToUndefined(val);
    if (v === undefined) return false;
    if (typeof v === 'boolean') return v;
    return String(v).toLowerCase() === 'true' || v === '1';
  }, z.boolean().default(false)),
  LOG_LEVEL: z.preprocess(
    emptyToUndefined,
    z.enum(['error', 'warn', 'info', 'debug']).default('info')
  ),
  AUDIO_SERVICE_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().default('http://localhost:8000')
  ),
  AUDIO_SERVICE_TIMEOUT_MS: z.preprocess((val) => {
    const v = emptyToUndefined(val);
    if (v === undefined) return 25000;
    const parsed = parseInt(String(v), 10);
    return isNaN(parsed) ? v : parsed;
  }, z.number().int().positive().default(25000)),
  GROQ_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  GROQ_MODEL: z.preprocess(emptyToUndefined, z.string().default('llama-3.3-70b-versatile')),
  NVIDIA_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  NVIDIA_MODEL: z.preprocess(emptyToUndefined, z.string().default('meta/llama-3.3-70b-instruct')),
  LLM_TIMEOUT_MS: z.preprocess((val) => {
    const v = emptyToUndefined(val);
    if (v === undefined) return 10000;
    const parsed = parseInt(String(v), 10);
    return isNaN(parsed) ? v : parsed;
  }, z.number().int().positive().default(10000)),
  VIRUSTOTAL_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  GOOGLE_SAFE_BROWSING_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  URLHAUS_AUTH_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  ABUSEIPDB_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  SECURITYTRAILS_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  IPQS_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  process.stderr.write('Invalid environment configuration:\n');
  parsed.error.issues.forEach((issue) => {
    process.stderr.write(`  - ${issue.path.join('.')}: ${issue.message}\n`);
  });
  process.exit(1);
}

const rawEnv = parsed.data;

const clientOrigins = rawEnv.CLIENT_ORIGIN
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = Object.freeze({
  ...rawEnv,
  clientOrigins: Object.freeze(clientOrigins),
});

/**
 * Returns booleans indicating which external services have API keys configured.
 * NEVER returns the actual secret keys.
 */
export function configuredServices() {
  return {
    groq: Boolean(env.GROQ_API_KEY),
    nvidia: Boolean(env.NVIDIA_API_KEY),
    virustotal: Boolean(env.VIRUSTOTAL_API_KEY),
    googleSafeBrowsing: Boolean(env.GOOGLE_SAFE_BROWSING_API_KEY),
    urlhaus: Boolean(env.URLHAUS_AUTH_KEY),
    abuseipdb: Boolean(env.ABUSEIPDB_API_KEY),
    securitytrails: Boolean(env.SECURITYTRAILS_API_KEY),
    ipqs: Boolean(env.IPQS_API_KEY),
  };
}

export default env;
