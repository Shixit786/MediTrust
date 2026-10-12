// TODO: remove after Stage 5
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.middleware.js';
import { createLimiter } from '../middlewares/rateLimit.middleware.js';
import { explain } from '../services/llm.service.js';

// TODO: remove after Stage 5
const router = Router();

// Test limiter: 10 requests/min
const testLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  code: 'TEST_RATE_LIMITED',
  message: 'Too many test requests, please wait.',
});

const testSchema = z.object({
  text: z.string().min(1, 'Text cannot be empty').max(1000, 'Text exceeds 1000 characters'),
});

router.post(
  '/llm',
  testLimiter,
  validate({ body: testSchema }),
  async (req, res, next) => {
    try {
      const { text } = req.validated.body;
      const result = await explain({
        system: 'Explain this security observation or telemetry concisely in plain English.',
        user: text,
      });

      return res.status(200).json({
        text: result.text,
        provider: result.provider,
        latencyMs: result.latencyMs,
        cached: result.cached,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
