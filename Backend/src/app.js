import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { requestIdMiddleware } from './middlewares/requestId.middleware.js';
import { requestLoggerMiddleware } from './middlewares/requestLogger.middleware.js';
import { globalRateLimiter } from './middlewares/rateLimit.middleware.js';
import { notFoundMiddleware } from './middlewares/notFound.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import apiRouter from './routes/index.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // 1. Request ID tracking
  app.use(requestIdMiddleware);

  // 2. Security Headers
  app.use(helmet());

  // 3. CORS Configuration
  const warnedOrigins = new Set();

  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile apps, curl, or Postman)
      if (!origin) {
        return callback(null, true);
      }

      if (env.clientOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Log warning once per unauthorized origin
      if (!warnedOrigins.has(origin)) {
        warnedOrigins.add(origin);
        logger.warn(`CORS rejected for unauthorized origin: ${origin}`);
      }

      return callback(null, false);
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    credentials: false,
  };

  app.use(cors(corsOptions));

  // 4. JSON Body Parser (1MB limit)
  app.use(express.json({ limit: '1mb' }));

  // 5. Audit Request Logger
  app.use(requestLoggerMiddleware);

  // 6. Global Rate Limiter on /api (health route is exempt inside limiter)
  app.use('/api', globalRateLimiter);

  // 7. Mount API Routes
  app.use('/api', apiRouter);

  // 8. 404 Catch-All Handler
  app.use(notFoundMiddleware);

  // 9. Central Error Handler
  app.use(errorMiddleware);

  return app;
}

export default createApp;
