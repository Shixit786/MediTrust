import mongoose from 'mongoose';
import { Scan } from '../models/Scan.js';
import { logger } from './logger.js';
import { clampScore, levelFromScore } from './risk.js';

/**
 * Saves a privacy-sanitized scan summary to MongoDB.
 * Returns null immediately if MongoDB is not connected (readyState !== 1).
 * Never throws an error; logs a warning on failure.
 *
 * @param {Object} data Scan data to persist
 * @returns {Promise<Object|null>} Saved scan or null
 */
export async function saveScan(data) {
  // If MongoDB is not connected, return immediately
  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  try {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const clampedRisk = clampScore(data.risk);
    const level = data.level || levelFromScore(clampedRisk);

    const whitelistedPayload = {
      shield: data.shield,
      risk: clampedRisk,
      level,
      threat: String(data.threat || 'Threat Evaluation Completed').trim(),
      signals: (Array.isArray(data.signals) ? data.signals : []).slice(0, 20).map((s) => ({
        name: String(s.name || '').slice(0, 80),
        detail: String(s.detail || '').slice(0, 300),
        severity: s.severity || 'low',
      })),
      summary: data.summary ? String(data.summary).slice(0, 300) : undefined,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    };

    const record = await Scan.create(whitelistedPayload);
    return record;
  } catch (error) {
    logger.warn('Failed to save audit scan to database:', error.message);
    return null;
  }
}

export default saveScan;
