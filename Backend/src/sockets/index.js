import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { indianPhoneSchema } from '../validators/common.js';
import { simStore, hashPhoneNumber } from '../services/sim/simStore.js';

let ioInstance = null;

// Track per-socket message rates: socketId -> { count, resetAt, joinedRooms: Set }
const socketRateMap = new Map();

const MAX_ROOMS_PER_SOCKET = 5;
const MAX_MESSAGES_PER_WINDOW = 20;
const RATE_WINDOW_MS = 10 * 1000; // 10 seconds

function checkSocketRateLimit(socketId) {
  const now = Date.now();
  let state = socketRateMap.get(socketId);
  if (!state || now > state.resetAt) {
    state = {
      count: 0,
      resetAt: now + RATE_WINDOW_MS,
      joinedRooms: state ? state.joinedRooms : new Set(),
    };
    socketRateMap.set(socketId, state);
  }

  state.count += 1;
  if (state.count > MAX_MESSAGES_PER_WINDOW) {
    return false;
  }
  return true;
}

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
    socketRateMap.set(socket.id, {
      count: 0,
      resetAt: Date.now() + RATE_WINDOW_MS,
      joinedRooms: new Set(),
    });

    // Built-in diagnostics ping handler
    socket.on('ping:test', (_payload, ack) => {
      if (typeof ack === 'function') {
        ack({ pong: true, time: Date.now() });
      }
    });

    // =========================================================================
    // SIM GUARD REAL-TIME TELEMETRY HOOKS:
    // Future Fusion engine integration: the Fusion correlation engine will
    // subscribe to these SIM state changes.
    // =========================================================================

    // join:sim { phone }
    socket.on('join:sim', (payload, ack) => {
      const socketState = socketRateMap.get(socket.id);
      if (!checkSocketRateLimit(socket.id)) {
        logger.warn(`Socket [${socket.id}] rate limited on join:sim`);
        if (typeof ack === 'function') ack({ ok: false, code: 'RATE_LIMITED' });
        return;
      }

      const parsedPhone = indianPhoneSchema.safeParse(payload?.phone);
      if (!parsedPhone.success) {
        if (typeof ack === 'function') ack({ ok: false, code: 'INVALID_PHONE' });
        return;
      }

      const phone = parsedPhone.data;
      const profile = simStore.get(phone);
      if (!profile) {
        if (typeof ack === 'function') ack({ ok: false, code: 'NOT_REGISTERED' });
        return;
      }

      if (socketState && socketState.joinedRooms.size >= MAX_ROOMS_PER_SOCKET) {
        if (typeof ack === 'function') ack({ ok: false, code: 'TOO_MANY_ROOMS' });
        return;
      }

      const hash = hashPhoneNumber(phone);
      const room = `sim:${hash}`;
      socket.join(room);
      if (socketState) socketState.joinedRooms.add(room);

      logger.info(`Socket [${socket.id}] joined SIM room: ok=true`);
      if (typeof ack === 'function') {
        ack({ ok: true, phoneMasked: profile.phoneMasked });
      }
    });

    // leave:sim { phone }
    socket.on('leave:sim', (payload, ack) => {
      if (!checkSocketRateLimit(socket.id)) {
        if (typeof ack === 'function') ack({ ok: false, code: 'RATE_LIMITED' });
        return;
      }

      const parsedPhone = indianPhoneSchema.safeParse(payload?.phone);
      if (parsedPhone.success) {
        const hash = hashPhoneNumber(parsedPhone.data);
        const room = `sim:${hash}`;
        socket.leave(room);
        const socketState = socketRateMap.get(socket.id);
        if (socketState) socketState.joinedRooms.delete(room);
      }

      if (typeof ack === 'function') {
        ack({ ok: true });
      }
    });

    // =========================================================================
    // FUSION ENGINE REAL-TIME BROADCAST HOOKS:
    // =========================================================================

    // join:fusion
    socket.on('join:fusion', (_payload, ack) => {
      const socketState = socketRateMap.get(socket.id);
      if (!checkSocketRateLimit(socket.id)) {
        if (typeof ack === 'function') ack({ ok: false, code: 'RATE_LIMITED' });
        return;
      }

      if (socketState && socketState.joinedRooms.size >= MAX_ROOMS_PER_SOCKET) {
        if (typeof ack === 'function') ack({ ok: false, code: 'TOO_MANY_ROOMS' });
        return;
      }

      socket.join('fusion');
      if (socketState) socketState.joinedRooms.add('fusion');
      logger.info(`Socket [${socket.id}] joined Fusion room: ok=true`);
      if (typeof ack === 'function') {
        ack({ ok: true });
      }
    });

    // leave:fusion
    socket.on('leave:fusion', (_payload, ack) => {
      socket.leave('fusion');
      const socketState = socketRateMap.get(socket.id);
      if (socketState) socketState.joinedRooms.delete('fusion');
      if (typeof ack === 'function') {
        ack({ ok: true });
      }
    });

    socket.on('disconnect', (reason) => {
      socketRateMap.delete(socket.id);
      logger.info(`Socket client disconnected: ${socket.id} (reason: ${reason})`);
    });
  });

  ioInstance = io;
  return io;
}

export function getIO() {
  return ioInstance;
}

/**
 * Emits compact fusion risk update to the fusion room.
 */
export function emitFusionUpdate(payload) {
  if (!ioInstance) return;
  ioInstance.to('fusion').emit('fusion:update', {
    risk: payload.risk,
    level: payload.level,
    threat: payload.threat,
    simulated: true,
  });
}

/**
 * Emits a single event update to the SIM room.
 */
export function emitSimEvent(phoneHash, payload) {
  if (!ioInstance) return;
  const room = `sim:${phoneHash}`;
  ioInstance.to(room).emit('sim:event', {
    ...payload,
    simulated: true,
  });
}

/**
 * Emits the full compact state to the SIM room.
 */
export function emitSimState(phoneHash, state) {
  if (!ioInstance) return;
  const room = `sim:${phoneHash}`;
  ioInstance.to(room).emit('sim:state', {
    ...state,
    simulated: true,
  });
}

/**
 * Emits freeze event to the SIM room.
 */
export function emitSimFreeze(phoneHash, payload) {
  if (!ioInstance) return;
  const room = `sim:${phoneHash}`;
  ioInstance.to(room).emit('sim:freeze', {
    ...payload,
    simulated: true,
  });
}

/**
 * Emits guardian alert event to the SIM room.
 */
export function emitSimGuardian(phoneHash, payload) {
  if (!ioInstance) return;
  const room = `sim:${phoneHash}`;
  ioInstance.to(room).emit('sim:guardian', {
    ...payload,
    simulated: true,
  });
}

/**
 * Emits reset event to the SIM room.
 */
export function emitSimReset(phoneHash, payload = {}) {
  if (!ioInstance) return;
  const room = `sim:${phoneHash}`;
  ioInstance.to(room).emit('sim:reset', {
    ...payload,
    simulated: true,
  });
}

export default initSocket;
