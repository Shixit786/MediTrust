import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.middleware.js';
import { createLimiter } from '../middlewares/rateLimit.middleware.js';
import {
  evaluateFusion,
  generateIncidentReport,
  getHistoryStatsHandler,
  getRecentScansHandler,
} from '../controllers/fusion.controller.js';

const router = Router();

// Rate limiters
const evaluateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many fusion evaluation requests. Please wait a minute.',
});

const reportLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many incident report requests. Please wait a minute.',
});

const historyLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many history requests. Please wait a minute.',
});

// Zod schemas for ShieldIn input
const signalInSchema = z.object({
  name: z.string().max(80),
  detail: z.string().max(200).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
}).strip();

const shieldInSchema = z.object({
  risk: z.coerce.number().min(0).max(100),
  level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  threat: z.string().max(80).optional(),
  confidence: z.coerce.number().min(0).max(1).optional(),
  signals: z.array(signalInSchema).max(8).optional(),
  emergency_claim: z.object({
    detected: z.boolean(),
    escalated: z.boolean(),
  }).optional(),
  frozen: z.boolean().optional(),
}).strip();

const evaluateBodySchema = z.object({
  voice: shieldInSchema.optional(),
  job: shieldInSchema.optional(),
  sim: shieldInSchema.optional(),
}).strip();

const reportBodySchema = z.object({
  voice: shieldInSchema.optional(),
  job: shieldInSchema.optional(),
  sim: shieldInSchema.optional(),
  incidentNote: z.string().max(500).optional().nullable(),
}).strip();

const recentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
});

// Routes
router.post('/evaluate', evaluateLimiter, validate({ body: evaluateBodySchema }), evaluateFusion);
router.post('/report', reportLimiter, validate({ body: reportBodySchema }), generateIncidentReport);
router.get('/history/stats', historyLimiter, getHistoryStatsHandler);
router.get('/history/recent', historyLimiter, validate({ query: recentQuerySchema }), getRecentScansHandler);

export default router;
