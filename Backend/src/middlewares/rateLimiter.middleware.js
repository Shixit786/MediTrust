import rateLimit from "express-rate-limit";

const defaultMessage = {
    success: false,
    message: "Too many requests, please try again later.",
};

/**
 * General API rate limiter: 15-minute window, max 200 requests by default.
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.RATE_LIMIT_MAX ? Number(process.env.RATE_LIMIT_MAX) : 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: defaultMessage,
});

/**
 * Strict rate limiter for sensitive/heavy routes: 15-minute window, max 30 requests by default.
 */
export const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.STRICT_RATE_LIMIT_MAX ? Number(process.env.STRICT_RATE_LIMIT_MAX) : 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: defaultMessage,
});
