import { Router } from 'express';
import { createLimiter } from '../middlewares/rateLimit.middleware.js';
import { optionalPdfUpload } from '../middlewares/upload.middleware.js';
import { analyzeJob } from '../controllers/job.controller.js';

const router = Router();

// Job Shield rate limiter: 20 requests per minute
const jobAnalyzeLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 20,
  code: 'RATE_LIMITED',
  message: 'Too many job analysis requests from this IP, please try again after a minute.',
});

router.post('/analyze', jobAnalyzeLimiter, optionalPdfUpload, analyzeJob);

export default router;
