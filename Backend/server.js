import http from 'node:http';
import mongoose from 'mongoose';
import { createApp } from './src/app.js';
import { env, configuredServices } from './src/config/env.js';
import { connectDB, disconnectDB } from './src/db/connect.js';
import { initSocket } from './src/sockets/index.js';
import { simStore } from './src/services/sim/simStore.js';
import { logger } from './src/utils/logger.js';

const app = createApp();
const server = http.createServer(app);
const io = initSocket(server);

// Expose Socket.io instance on express application
app.set('io', io);

// Server error handler
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${env.PORT} is already in use.`);
    process.exit(1);
  }
  logger.error('HTTP Server startup error:', err);
  process.exit(1);
});

// Process-level unhandled rejection & uncaught exception safety
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception occurred:', err);
  process.exit(1);
});

// Graceful shutdown lifecycle
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  // Force termination fallback after 10 seconds
  const forceExitTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10s. Forcing exit.');
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  try {
    // 1. Close Socket.io server and clear SIM timers
    simStore.clearAll();
    if (io) {
      await new Promise((resolve) => io.close(resolve));
      logger.info('Socket.io server closed.');
    }

    // 2. Close HTTP Server
    await new Promise((resolve) => server.close(resolve));
    logger.info('HTTP server closed.');

    // 3. Disconnect MongoDB
    await disconnectDB();

    clearTimeout(forceExitTimer);
    logger.info('Graceful shutdown completed successfully.');
    process.exit(0);
  } catch (error) {
    logger.error('Error encountered during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Boot sequence
async function start() {
  // Connect to DB (never crashes the server if unavailable)
  await connectDB();

  server.listen(env.PORT, () => {
    const isDbConnected = mongoose.connection.readyState === 1;
    const dbStatus = isDbConnected
      ? 'connected'
      : env.MONGODB_URI
      ? 'disconnected (expected but unavailable)'
      : 'not configured (running in-memory)';

    const banner = [
      '================================================================',
      '                   MEDITRUST AI BACKEND SERVER                  ',
      '================================================================',
      ` Port:                ${env.PORT}`,
      ` Environment:         ${env.NODE_ENV}`,
      ` Demo Mode:           ${env.DEMO_MODE}`,
      ` Database Status:     ${dbStatus}`,
      ` Audio Service:       ${env.AUDIO_SERVICE_URL}`,
      ` Configured Services: ${JSON.stringify(configuredServices())}`,
      ` Client Origins:      ${env.clientOrigins.join(', ')}`,
      '================================================================',
    ].join('\n');

    logger.info(`\n${banner}\nServer is operational and accepting requests.`);
  });
}

start();
