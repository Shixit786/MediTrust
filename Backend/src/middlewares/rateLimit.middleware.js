import rateLimit from 'express-rate-limit';

export function createLimiter({
  windowMs = 60 * 1000,
  max = 120,
  code = 'RATE_LIMITED',
  message = 'Too many requests, please try again later.',
  skip = undefined,
} = {}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip,
    handler: (req, res, _next, options) => {
      const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: message,
        code,
        requestId: req.id,
      });
    },
  });
}

// Global API Limiter: 120 requests / min per IP on /api, health endpoint is exempt
export const globalRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 120,
  code: 'RATE_LIMITED',
  message: 'Too many requests on /api. Please wait before retrying.',
  skip: (req) => {
    const path = req.path || req.originalUrl || '';
    return path.endsWith('/health') || path.includes('/health');
  },
});

export default globalRateLimiter;
