import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const registerSim = asyncHandler(async (_req, _res) => {
  throw ApiError.notImplemented('SIM Guard registration is not implemented yet', 'NOT_IMPLEMENTED');
});

export const getSimByPhone = asyncHandler(async (_req, _res) => {
  throw ApiError.notImplemented('SIM Guard status query is not implemented yet', 'NOT_IMPLEMENTED');
});

export const simulateSimEvent = asyncHandler(async (_req, _res) => {
  throw ApiError.notImplemented('SIM Guard simulation is not implemented yet', 'NOT_IMPLEMENTED');
});

export const resetSim = asyncHandler(async (_req, _res) => {
  throw ApiError.notImplemented('SIM Guard reset is not implemented yet', 'NOT_IMPLEMENTED');
});
