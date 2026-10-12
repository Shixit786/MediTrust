import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const evaluateFusion = asyncHandler(async (_req, _res) => {
  throw ApiError.notImplemented('Fusion Engine evaluation is not implemented yet', 'NOT_IMPLEMENTED');
});
