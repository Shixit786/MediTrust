import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clampScore, levelFromScore } from '../../utils/risk.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load static event catalogue
const eventsPath = path.join(__dirname, '..', '..', 'data', 'simEvents.json');
const catalogueData = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));
export const EVENT_CATALOGUE = catalogueData.events;

// Base event weights
export const BASE_WEIGHTS = {
  sim_swap: 40,
  call_forwarding: 25,
  otp_flood: 20,
  imei_change: 25,
  new_device_login: 15,
  port_out_request: 35,
  location_anomaly: 15,
};

// Combo bonuses: +15 each, max +30 total
export const COMBO_BONUSES = [
  { pair: ['sim_swap', 'otp_flood'], bonus: 15 },
  { pair: ['sim_swap', 'call_forwarding'], bonus: 15 },
  { pair: ['port_out_request', 'new_device_login'], bonus: 15 },
];
export const MAX_COMBO_BONUS = 30;

export const SIM_TIME_WINDOWS = {
  RECENCY_DECAY_MS: 30 * 60 * 1000, // 30 minutes
  DECAY_FACTOR: 0.7, // 70% of base weight if > 30 minutes old
  MAX_WINDOW_MS: 24 * 60 * 60 * 1000, // 24 hours
};

const SEVERITY_ORDER = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Creates a normalized event object from type.
 */
export function createSimEvent(type, overrides = {}) {
  const meta = EVENT_CATALOGUE[type] || {
    type,
    title: String(type).replace(/_/g, ' ').toUpperCase(),
    detail: 'Simulated telecom anomaly trigger',
    severity: 'medium',
    weight: 15,
  };

  const now = overrides.timestamp ? new Date(overrides.timestamp).getTime() : Date.now();
  const dateObj = new Date(now);
  const timeFormatted = dateObj.toTimeString().split(' ')[0]; // HH:MM:SS

  return {
    id: `sim_ev_${now}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: overrides.timestamp || dateObj.toISOString(),
    timeFormatted,
    type: meta.type,
    telemetryType: meta.telemetryType || meta.type.toUpperCase(),
    title: overrides.title || meta.title,
    detail: overrides.detail || meta.detail,
    message: overrides.detail || meta.detail, // frontend compatibility alias
    severity: overrides.severity || meta.severity,
    weight: meta.weight,
  };
}

/**
 * Determines the threat label from the risk score.
 */
export function determineSimThreatLabel(score) {
  if (score >= 60) return 'SIM Swap Attack Pattern';
  if (score >= 30) return 'Suspicious SIM Activity';
  return 'No Strong SIM Anomaly';
}

/**
 * Evaluates current events against the risk engine rules.
 * Pure deterministic function.
 *
 * @param {Array<Object>} events Chronological list of events
 * @param {number} [currentTime=Date.now()] Reference timestamp for simulated time
 * @returns {Object} Evaluation summary
 */
export function evaluateSimRisk(events = [], currentTime = Date.now()) {
  if (!Array.isArray(events) || events.length === 0) {
    return {
      riskScore: 0,
      level: 'low',
      threat: determineSimThreatLabel(0),
      signals: [],
      distinctTypes: [],
      comboBonus: 0,
    };
  }

  // 1. Filter events within the 24-hour simulated window
  const recentEvents = events.filter((ev) => {
    const evTime = new Date(ev.timestamp).getTime();
    return currentTime - evTime <= SIM_TIME_WINDOWS.MAX_WINDOW_MS;
  });

  // 2. Track highest weight and freshest instance per distinct type
  const typeMap = new Map();
  for (const ev of recentEvents) {
    const type = ev.type;
    const baseWeight = BASE_WEIGHTS[type] || ev.weight || 0;
    const evTime = new Date(ev.timestamp).getTime();
    const age = currentTime - evTime;

    // Apply 70% decay if older than 30 minutes
    const effectiveWeight =
      age > SIM_TIME_WINDOWS.RECENCY_DECAY_MS
        ? Math.round(baseWeight * SIM_TIME_WINDOWS.DECAY_FACTOR)
        : baseWeight;

    const existing = typeMap.get(type);
    if (!existing || effectiveWeight > existing.effectiveWeight) {
      typeMap.set(type, {
        event: ev,
        effectiveWeight,
        baseWeight,
      });
    }
  }

  // 3. Sum weights of distinct types
  let rawScore = 0;
  for (const item of typeMap.values()) {
    rawScore += item.effectiveWeight;
  }

  // 4. Calculate combo bonuses (+15 each, max +30)
  const distinctTypes = Array.from(typeMap.keys());
  let comboBonus = 0;
  for (const combo of COMBO_BONUSES) {
    const hasBoth = combo.pair.every((t) => distinctTypes.includes(t));
    if (hasBoth) {
      comboBonus += combo.bonus;
    }
  }
  comboBonus = Math.min(MAX_COMBO_BONUS, comboBonus);

  const finalScore = clampScore(rawScore + comboBonus);
  const level = levelFromScore(finalScore);
  const threat = determineSimThreatLabel(finalScore);

  // 5. Generate signals: one per distinct event type, most severe first, at most 8
  const signals = Array.from(typeMap.values())
    .map(({ event }) => ({
      name: event.title,
      detail: event.detail,
      severity: event.severity || 'medium',
    }))
    .sort((a, b) => {
      const orderA = SEVERITY_ORDER[a.severity] || 0;
      const orderB = SEVERITY_ORDER[b.severity] || 0;
      return orderB - orderA;
    })
    .slice(0, 8);

  return {
    riskScore: finalScore,
    level,
    threat,
    signals,
    distinctTypes,
    comboBonus,
  };
}

export default {
  BASE_WEIGHTS,
  COMBO_BONUSES,
  EVENT_CATALOGUE,
  createSimEvent,
  determineSimThreatLabel,
  evaluateSimRisk,
};
