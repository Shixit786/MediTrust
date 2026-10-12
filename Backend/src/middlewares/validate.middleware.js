import { ApiError } from '../utils/ApiError.js';

/**
 * Middleware factory for validating request body, query, and params using Zod.
 * Successfully parsed data is stored in `req.validated`.
 * Note: Never assigns directly to `req.query` to ensure compatibility across Express 4 and 5.
 */
export function validate({ body, query, params } = {}) {
  return (req, _res, next) => {
    try {
      const validated = { ...req.validated };
      const issues = [];

      if (body) {
        const result = body.safeParse(req.body);
        if (!result.success) {
          for (const issue of result.error.issues) {
            issues.push({
              location: 'body',
              path: issue.path.join('.'),
              message: issue.message,
            });
          }
        } else {
          validated.body = result.data;
        }
      }

      if (query) {
        const result = query.safeParse(req.query);
        if (!result.success) {
          for (const issue of result.error.issues) {
            issues.push({
              location: 'query',
              path: issue.path.join('.'),
              message: issue.message,
            });
          }
        } else {
          validated.query = result.data;
        }
      }

      if (params) {
        const result = params.safeParse(req.params);
        if (!result.success) {
          for (const issue of result.error.issues) {
            issues.push({
              location: 'params',
              path: issue.path.join('.'),
              message: issue.message,
            });
          }
        } else {
          validated.params = result.data;
        }
      }

      if (issues.length > 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed', issues);
      }

      req.validated = validated;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export default validate;
