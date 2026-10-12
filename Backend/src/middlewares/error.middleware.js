import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export function errorMiddleware(err, req, res, _next) {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected internal error occurred.';
  let details = undefined;

  // 1. ApiError
  if (err instanceof ApiError || err.name === 'ApiError') {
    statusCode = err.statusCode || 500;
    code = err.code || 'API_ERROR';
    message = err.message;
    details = err.details;
  }
  // 2. Zod Validation Error
  else if (err instanceof ZodError || err.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed.';
    details = err.issues || err.errors;
  }
  // 3. Body-parser invalid JSON syntax
  else if (
    (err instanceof SyntaxError && err.status === 400 && 'body' in err) ||
    err.type === 'entity.parse.failed'
  ) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Malformed JSON body in request.';
  }
  // 4. Payload too large (express.json limit)
  else if (err.type === 'entity.too.large' || err.status === 413) {
    statusCode = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request payload exceeds the 1MB size limit.';
  }
  // 5. Multer file upload errors
  else if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      code = 'FILE_TOO_LARGE';
      message = 'Uploaded file exceeds the permitted size limit.';
    } else {
      statusCode = 400;
      code = 'UPLOAD_ERROR';
      message = err.message || 'File upload error occurred.';
    }
  }
  // 6. Mongoose validation or cast error
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = err.message || 'Database validation failed.';
    details = err.errors;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid database identifier format for field: ${err.path}`;
  }
  // 7. Generic fallback
  else {
    if (err.statusCode && typeof err.statusCode === 'number') {
      statusCode = err.statusCode;
    } else if (err.status && typeof err.status === 'number') {
      statusCode = err.status;
    }
    if (statusCode < 500) {
      code = err.code || 'BAD_REQUEST';
      message = err.message || message;
    }
  }

  // Always log error with requestId (message and stack only, NEVER the request body)
  logger.error(
    `Error on ${req.method} ${req.originalUrl || req.url} (requestId: ${req.id}) [${statusCode} ${code}]: ${message}`,
    err.stack || ''
  );

  const payload = {
    error: message,
    code,
    ...(details !== undefined ? { details } : {}),
    requestId: req.id,
  };

  if (env.NODE_ENV === 'development' && err.stack) {
    payload.stack = err.stack;
  }

  return res.status(statusCode).json(payload);
}

export default errorMiddleware;
