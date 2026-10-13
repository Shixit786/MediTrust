import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { processChat } from '../services/chat.service.js';

export const chatHandler = asyncHandler(async (req, res) => {
  const payload = req.validated?.body || req.body;
  const result = await processChat(payload);
  return ok(res, result);
});

export default { chatHandler };
