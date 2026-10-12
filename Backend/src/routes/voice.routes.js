import { Router } from 'express';
import { createLimiter } from '../middlewares/rateLimit.middleware.js';
import { uploadAudio } from '../middlewares/upload.middleware.js';
import { analyzeVoice } from '../controllers/voice.controller.js';

const router = Router();

const voiceLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  code: 'RATE_LIMITED',
  message: 'Too many voice analysis requests. Please wait before retrying.',
});

router.post('/analyze', voiceLimiter, uploadAudio, analyzeVoice);

export default router;
