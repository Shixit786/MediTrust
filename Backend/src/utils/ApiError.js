export class ApiError extends Error {
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, code = 'BAD_REQUEST', details) {
    return new ApiError(400, code, message, details);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new ApiError(404, code, message);
  }

  static tooMany(message = 'Too many requests, please try again later.', code = 'RATE_LIMITED') {
    return new ApiError(429, code, message);
  }

  static conflict(message = 'Resource conflict', code = 'CONFLICT', details) {
    return new ApiError(409, code, message, details);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN', details) {
    return new ApiError(403, code, message, details);
  }

  static notImplemented(message = 'Endpoint not implemented', code = 'NOT_IMPLEMENTED') {
    return new ApiError(501, code, message);
  }

  static unavailable(message = 'Service temporarily unavailable', code = 'SERVICE_UNAVAILABLE') {
    return new ApiError(503, code, message);
  }
}

export default ApiError;
