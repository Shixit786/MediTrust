import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.middleware.js';
import { createLimiter } from '../middlewares/rateLimit.middleware.js';
import { chatHandler } from '../controllers/chat.controller.js';

const router = Router();

// Rate limiter: 20 requests per minute
const chatLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 20,
  code: 'RATE_LIMITED',
  message: 'Too many chat requests. Please wait a moment before sending another message.',
});

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(500, 'Message cannot exceed 500 characters'),
});

const resultContextSchema = z.object({
  shield: z.enum(['voice', 'job', 'sim', 'fusion']),
  risk: z.number().min(0).max(100),
  level: z.string(),
  threat: z.string().max(80),
  signals: z.array(z.string().max(60)).max(3).optional(),
});

export const chatRequestSchema = z.object({
  messages: z
    .array(messageSchema)
    .min(1, 'At least one message is required')
    .max(8, 'Maximum of 8 messages allowed')
    .refine((msgs) => msgs[msgs.length - 1]?.role === 'user', {
      message: 'The last message must be from the user',
      path: ['messages'],
    }),
  context: z
    .object({
      page: z.string().max(100).optional(),
      results: z.array(resultContextSchema).max(4).optional(),
    })
    .optional(),
});

router.post(
  '/',
  chatLimiter,
  validate({ body: chatRequestSchema }),
  chatHandler
);

export default router;
