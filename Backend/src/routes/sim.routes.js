import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.middleware.js';
import { createLimiter } from '../middlewares/rateLimit.middleware.js';
import { indianPhoneSchema } from '../validators/common.js';
import {
  registerSim,
  getSimByPhone,
  simulateSimEvent,
  freezeSim,
  alertGuardian,
  resetSim,
} from '../controllers/sim.controller.js';

const router = Router();

// Rate limiters
const registerLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many SIM registration requests. Please wait a minute.',
});

const simulateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 40,
  message: 'Too many SIM simulation requests. Please wait a minute.',
});

// Validation schemas
const registerSchema = {
  body: z.object({
    phone: indianPhoneSchema,
    guardianName: z
      .string()
      .trim()
      .regex(/^[a-zA-Z\s]+$/, 'Guardian name must contain only letters and spaces')
      .max(40, 'Guardian name cannot exceed 40 characters')
      .optional()
      .nullable(),
  }),
};

const getPhoneSchema = {
  params: z.object({
    phone: indianPhoneSchema,
  }),
};

const simulateSchema = {
  params: z.object({
    type: z.string().trim(),
  }),
  body: z.object({
    phone: indianPhoneSchema,
  }),
};

const phoneBodySchema = {
  body: z.object({
    phone: indianPhoneSchema,
  }),
};

const resetSchema = {
  body: z
    .object({
      phone: indianPhoneSchema.optional().nullable(),
    })
    .optional(),
};

// Routes definition
router.post('/register', registerLimiter, validate(registerSchema), registerSim);
router.get('/:phone', validate(getPhoneSchema), getSimByPhone);
router.post('/simulate/:type', simulateLimiter, validate(simulateSchema), simulateSimEvent);
router.post('/freeze', validate(phoneBodySchema), freezeSim);
router.post('/guardian-alert', validate(phoneBodySchema), alertGuardian);
router.post('/reset', validate(resetSchema), resetSim);

export default router;
