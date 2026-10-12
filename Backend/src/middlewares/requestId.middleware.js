import crypto from 'node:crypto';

export function requestIdMiddleware(req, res, next) {
  const id = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = id;
  res.setHeader('x-request-id', id);
  next();
}

export default requestIdMiddleware;
