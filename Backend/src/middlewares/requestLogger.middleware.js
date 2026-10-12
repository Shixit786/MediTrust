import { logger } from '../utils/logger.js';

export function requestLoggerMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const rawPath = (req.originalUrl || req.url || '').split('?')[0];
    // Mask any 8+ digit sequences (e.g., phone numbers in route params)
    const maskedPath = rawPath.replace(/\d{8,}/g, '[MASKED_DIGITS]');

    logger.info(
      `${req.method} ${maskedPath} ${res.statusCode} ${durationMs.toFixed(1)}ms (requestId: ${req.id})`
    );
  });

  next();
}

export default requestLoggerMiddleware;
