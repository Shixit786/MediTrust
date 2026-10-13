import mongoose from 'mongoose';
import { Scan } from '../../models/Scan.js';
import { logger } from '../../utils/logger.js';

/**
 * Aggregates anonymous platform statistics from the Scan collection.
 * Gracefully degrades to zeros if MongoDB is unavailable.
 */
export async function getHistoryStats() {
  const isDbConnected = mongoose.connection.readyState === 1;

  const emptyStats = {
    totalScans: 0,
    byShield: { voice: 0, job: 0, sim: 0, fusion: 0 },
    byLevel: { low: 0, medium: 0, high: 0, critical: 0 },
    avgRisk: 0,
    last7Days: [],
    topThreats: [],
    db: isDbConnected ? 'connected' : 'disconnected',
    note: 'Anonymous demo statistics, not tied to any user.',
  };

  if (!isDbConnected) {
    return emptyStats;
  }

  try {
    const totalScans = await Scan.countDocuments();
    if (totalScans === 0) {
      return emptyStats;
    }

    // 1. By Shield Counts
    const shieldAgg = await Scan.aggregate([
      { $group: { _id: '$shield', count: { $sum: 1 } } },
    ]);
    const byShield = { voice: 0, job: 0, sim: 0, fusion: 0 };
    for (const item of shieldAgg) {
      if (item._id in byShield) {
        byShield[item._id] = item.count;
      }
    }

    // 2. By Level Counts
    const levelAgg = await Scan.aggregate([
      { $group: { _id: '$level', count: { $sum: 1 } } },
    ]);
    const byLevel = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const item of levelAgg) {
      if (item._id in byLevel) {
        byLevel[item._id] = item.count;
      }
    }

    // 3. Average Risk
    const avgAgg = await Scan.aggregate([
      { $group: { _id: null, avgRisk: { $avg: '$risk' } } },
    ]);
    const avgRisk = avgAgg.length > 0 ? Math.round(avgAgg[0].avgRisk) : 0;

    // 4. Last 7 Days Daily Breakdown
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const daysAgg = await Scan.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          avgRisk: { $avg: '$risk' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const last7Days = daysAgg.map((d) => ({
      date: d._id,
      count: d.count,
      avgRisk: Math.round(d.avgRisk),
    }));

    // 5. Top 5 Threats
    const threatsAgg = await Scan.aggregate([
      { $match: { threat: { $exists: true, $ne: '' } } },
      { $group: { _id: '$threat', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const topThreats = threatsAgg.map((t) => ({
      threat: t._id,
      count: t.count,
    }));

    return {
      totalScans,
      byShield,
      byLevel,
      avgRisk,
      last7Days,
      topThreats,
      db: 'connected',
      note: 'Anonymous demo statistics, not tied to any user.',
    };
  } catch (error) {
    logger.warn('Failed to aggregate history stats from database:', error.message);
    return {
      ...emptyStats,
      db: 'disconnected',
    };
  }
}

/**
 * Retrieves recent anonymous scan logs.
 *
 * @param {number} [limit=20]
 * @returns {Promise<Array<Object>>}
 */
export async function getRecentScans(limit = 20) {
  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  try {
    const safeLimit = Math.min(50, Math.max(1, limit));
    const records = await Scan.find({}, 'shield risk level threat createdAt')
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean();

    return records.map((r) => ({
      id: r._id ? String(r._id) : undefined,
      shield: r.shield,
      risk: r.risk,
      level: r.level,
      threat: r.threat,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    logger.warn('Failed to retrieve recent scans from database:', error.message);
    return [];
  }
}

export default {
  getHistoryStats,
  getRecentScans,
};
