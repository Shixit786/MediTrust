import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const analyzeJob = asyncHandler(async (_req, _res) => {
  throw ApiError.notImplemented('Job Shield analysis is not implemented yet', 'NOT_IMPLEMENTED');
});
