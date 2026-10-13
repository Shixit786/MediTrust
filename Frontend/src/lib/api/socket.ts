/**
 * Shared Socket.io client instance for real-time SIM and Fusion telemetry.
 * Configured with lazy connect, autoConnect: false, and backoff reconnection.
 */

import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './client';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(API_BASE_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    });
  }
  if (!socketInstance.connected && !socketInstance.active) {
    socketInstance.connect();
  }
  return socketInstance;
}

export function joinSim(phone: string): Promise<{ ok: boolean; phoneMasked?: string }> {
  const socket = getSocket();
  return new Promise((resolve) => {
    const doJoin = () => {
      socket.emit('join:sim', { phone }, (ack: { ok: boolean; phoneMasked?: string } | undefined) => {
        resolve(ack || { ok: true });
      });
    };

    if (socket.connected) {
      doJoin();
    } else {
      socket.once('connect', doJoin);
    }
  });
}

export function leaveSim(phone: string): void {
  if (socketInstance && socketInstance.connected) {
    socketInstance.emit('leave:sim', { phone });
  }
}

export function joinFusion(): void {
  const socket = getSocket();
  if (socket.connected) {
    socket.emit('join:fusion');
  } else {
    socket.once('connect', () => {
      socket.emit('join:fusion');
    });
  }
}

export function leaveFusion(): void {
  if (socketInstance && socketInstance.connected) {
    socketInstance.emit('leave:fusion');
  }
}

export function onSimEvent(callback: (payload: unknown) => void): () => void {
  const socket = getSocket();
  socket.on('sim:event', callback);
  return () => {
    socket.off('sim:event', callback);
  };
}

export function onSimState(callback: (payload: unknown) => void): () => void {
  const socket = getSocket();
  socket.on('sim:state', callback);
  return () => {
    socket.off('sim:state', callback);
  };
}

export function onSimFreeze(callback: (payload: unknown) => void): () => void {
  const socket = getSocket();
  socket.on('sim:freeze', callback);
  return () => {
    socket.off('sim:freeze', callback);
  };
}

export function onFusionUpdate(callback: (payload: unknown) => void): () => void {
  const socket = getSocket();
  socket.on('fusion:update', callback);
  return () => {
    socket.off('fusion:update', callback);
  };
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
