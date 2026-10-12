import { ApiError } from '../utils/ApiError.js';

export function notFoundMiddleware(req, _res, next) {
  const method = req.method;
  const path = (req.originalUrl || req.url || '').split('?')[0];
  next(new ApiError(404, 'NOT_FOUND', `Route ${method} ${path} not found`));
}

export default notFoundMiddleware;
