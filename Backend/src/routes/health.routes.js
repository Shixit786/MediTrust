import { Router } from 'express';
import mongoose from 'mongoose';
import { env, configuredServices } from '../config/env.js';
import { getLlmStatus } from '../services/llm.service.js';
import { checkAudioHealth } from '../services/audio.service.js';
import { getIntelStatus } from '../services/intel/intel.service.js';

const router = Router();

router.get('/', async (_req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const isDbExpected = Boolean(env.MONGODB_URI);

  // Status is degraded if database was expected but is not connected
  const status = isDbExpected && !isDbConnected ? 'degraded' : 'ok';
  const audioHealth = await checkAudioHealth();

  return res.status(200).json({
    status,
    time: new Date().toISOString(),
    uptimeSec: Math.floor(process.uptime()),
    env: env.NODE_ENV,
    demoMode: env.DEMO_MODE,
    db: isDbConnected ? 'connected' : 'disconnected',
    services: configuredServices(),
    llm: getLlmStatus(),
    audio: audioHealth,
    intel: getIntelStatus(),
  });
});

export default router;
