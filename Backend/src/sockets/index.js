import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let ioInstance = null;

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: [...env.clientOrigins],
      methods: ['GET', 'POST'],
      credentials: false,
    },
    maxHttpBufferSize: 1e6, // 1MB maximum frame size
  });

  io.on('connection', (socket) => {
    logger.info(`Socket client connected: ${socket.id}`);

    // Built-in diagnostics ping handler
    socket.on('ping:test', (_payload, ack) => {
      if (typeof ack === 'function') {
        ack({ pong: true, time: Date.now() });
      }
    });

    // =========================================================================
    // SIM GUARD REAL-TIME TELEMETRY HOOKS (FUTURE STAGE):
    // Handlers will be attached here:
    // - socket.on('join:sim', ({ phone }) => ...)
    // - socket.on('sim:event', (payload) => ...)
    // =========================================================================

    socket.on('disconnect', (reason) => {
      logger.info(`Socket client disconnected: ${socket.id} (reason: ${reason})`);
    });
  });

  ioInstance = io;
  return io;
}

export function getIO() {
  return ioInstance;
}

export default initSocket;
