import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

export async function connectDB() {
  if (!env.MONGODB_URI) {
    logger.warn('MONGODB_URI is not configured. Server will run without database persistence.');
    return false;
  }

  try {
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected.');
    });

    mongoose.connection.on('error', (err) => {
      logger.warn('MongoDB runtime error:', err.message);
    });

    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    logger.info('Connected to MongoDB database.');
    return true;
  } catch (error) {
    logger.warn(`MongoDB initial connection failed (${error.message}). Running in disconnected mode.`);
    return false;
  }
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
      logger.info('MongoDB connection closed.');
    } catch (err) {
      logger.warn('Error closing MongoDB connection:', err.message);
    }
  }
}

export default connectDB;
