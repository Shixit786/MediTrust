import crypto from 'node:crypto';

// Per-process random salt generated on module boot
const PROCESS_SALT = crypto.randomBytes(16).toString('hex');

const DEFAULT_MAX_PROFILES = 200;
const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const DEFAULT_SWEEP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_EVENTS_PER_PROFILE = 50;

/**
 * Formats a 10-digit Indian phone number as: "+91 98••• ••210"
 * (First 2 digits and last 3 digits visible)
 */
export function maskPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return '+91 ••••• •••••';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return '+91 ••••• •••••';
  const clean10 = digits.slice(-10);
  const d1 = clean10.slice(0, 2);
  const d2 = clean10.slice(-3);
  return `+91 ${d1}••• ••${d2}`;
}

/**
 * Computes a non-reversible SHA-256 hash using the 10-digit phone digits + per-process salt.
 */
export function hashPhoneNumber(phone, salt = PROCESS_SALT) {
  const digits = String(phone || '').replace(/\D/g, '').slice(-10);
  return crypto
    .createHash('sha256')
    .update(`${digits}:${salt}`)
    .digest('hex');
}

export class SimStore {
  constructor(options = {}) {
    this.maxProfiles = options.maxProfiles || DEFAULT_MAX_PROFILES;
    this.ttlMs = options.ttlMs || DEFAULT_TTL_MS;
    this.salt = options.salt || PROCESS_SALT;
    this.store = new Map();

    const sweepInterval = options.sweepIntervalMs || DEFAULT_SWEEP_INTERVAL_MS;
    if (options.autoSweep !== false) {
      this.sweepInterval = setInterval(() => {
        this.sweep();
      }, sweepInterval);
      if (this.sweepInterval.unref) {
        this.sweepInterval.unref();
      }
    }
  }

  getHash(phone) {
    return hashPhoneNumber(phone, this.salt);
  }

  /**
   * Registers a new phone profile or refreshes an existing one.
   */
  register(phone, guardianName = null) {
    const key = this.getHash(phone);
    const now = Date.now();
    const masked = maskPhoneNumber(phone);

    let profile = this.store.get(key);
    if (profile) {
      // Clear any pending timers when re-registering
      this.clearTimersByKey(key);

      profile.updatedAt = now;
      profile.phoneMasked = masked;
      profile.simNumber = masked;
      if (guardianName !== undefined) {
        profile.guardian = guardianName ? { name: String(guardianName).trim() } : null;
      }
      // Re-insert to refresh LRU eviction ordering
      this.store.delete(key);
      this.store.set(key, profile);
      return profile;
    }

    // Evict oldest profile if at max capacity
    if (this.store.size >= this.maxProfiles) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.clearTimersByKey(oldestKey);
        this.store.delete(oldestKey);
      }
    }

    profile = {
      phoneMasked: masked,
      simNumber: masked,
      createdAt: now,
      updatedAt: now,
      events: [],
      riskScore: 0,
      level: 'low',
      threat: 'No Strong SIM Anomaly',
      frozen: false,
      freezeAt: null,
      guardianAlerted: false,
      trustedContactAlerted: false,
      guardian: guardianName ? { name: String(guardianName).trim() } : null,
      timers: [],
    };

    this.store.set(key, profile);
    return profile;
  }

  /**
   * Retrieves profile by phone.
   */
  get(phone) {
    const key = this.getHash(phone);
    const profile = this.store.get(key);
    if (!profile) return null;

    // Check expiration
    if (Date.now() - profile.updatedAt > this.ttlMs) {
      this.clearTimersByKey(key);
      this.store.delete(key);
      return null;
    }

    return profile;
  }

  /**
   * Retrieves profile directly by hash.
   */
  getByHash(key) {
    const profile = this.store.get(key);
    if (!profile) return null;
    if (Date.now() - profile.updatedAt > this.ttlMs) {
      this.clearTimersByKey(key);
      this.store.delete(key);
      return null;
    }
    return profile;
  }

  /**
   * Appends an event to the profile and updates timestamps.
   * Caps events at MAX_EVENTS_PER_PROFILE (50).
   */
  appendEvent(phone, event) {
    const key = this.getHash(phone);
    const profile = this.get(phone);
    if (!profile) return null;

    profile.updatedAt = Date.now();
    profile.events.push(event);

    if (profile.events.length > MAX_EVENTS_PER_PROFILE) {
      profile.events = profile.events.slice(-MAX_EVENTS_PER_PROFILE);
    }

    this.store.delete(key);
    this.store.set(key, profile);
    return profile;
  }

  /**
   * Sets freeze status.
   */
  setFrozen(phone, frozen = true) {
    const profile = this.get(phone);
    if (!profile) return null;

    profile.updatedAt = Date.now();
    profile.frozen = Boolean(frozen);
    profile.freezeAt = frozen ? new Date().toISOString() : null;
    return profile;
  }

  /**
   * Sets guardian alerted status.
   */
  setGuardianAlerted(phone, alerted = true) {
    const profile = this.get(phone);
    if (!profile) return null;

    profile.updatedAt = Date.now();
    profile.guardianAlerted = Boolean(alerted);
    profile.trustedContactAlerted = Boolean(alerted);
    return profile;
  }

  /**
   * Updates risk assessment results on the profile.
   */
  updateRisk(phone, { riskScore, level, threat }) {
    const profile = this.get(phone);
    if (!profile) return null;

    profile.updatedAt = Date.now();
    if (typeof riskScore === 'number') profile.riskScore = riskScore;
    if (level) profile.level = level;
    if (threat) profile.threat = threat;
    return profile;
  }

  /**
   * Registers an active timer on the profile.
   */
  addTimer(phone, timerHandle) {
    const profile = this.get(phone);
    if (!profile) return;
    profile.timers.push(timerHandle);
  }

  /**
   * Clears all timers on a profile.
   */
  clearTimers(phone) {
    const key = this.getHash(phone);
    this.clearTimersByKey(key);
  }

  clearTimersByKey(key) {
    const profile = this.store.get(key);
    if (!profile || !Array.isArray(profile.timers)) return;

    for (const timer of profile.timers) {
      try {
        clearTimeout(timer);
      } catch {
        // ignore
      }
    }
    profile.timers = [];
  }

  /**
   * Resets a specific profile's events, timers, and states.
   */
  reset(phone) {
    const key = this.getHash(phone);
    const profile = this.get(phone);
    if (!profile) return null;

    this.clearTimersByKey(key);
    profile.updatedAt = Date.now();
    profile.events = [];
    profile.riskScore = 0;
    profile.level = 'low';
    profile.threat = 'No Strong SIM Anomaly';
    profile.frozen = false;
    profile.freezeAt = null;
    profile.guardianAlerted = false;
    profile.trustedContactAlerted = false;
    return profile;
  }

  /**
   * Sweeps expired profiles.
   */
  sweep(ttlMs = this.ttlMs) {
    const now = Date.now();
    let swept = 0;
    for (const [key, profile] of this.store.entries()) {
      if (now - profile.updatedAt > ttlMs) {
        this.clearTimersByKey(key);
        this.store.delete(key);
        swept++;
      }
    }
    return swept;
  }

  /**
   * Clears all profiles and stops timers.
   */
  clearAll() {
    for (const key of this.store.keys()) {
      this.clearTimersByKey(key);
    }
    this.store.clear();
  }

  /**
   * Teardown sweep interval.
   */
  destroy() {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
    }
    this.clearAll();
  }

  size() {
    return this.store.size;
  }
}

// Singleton store instance
export const simStore = new SimStore();
export default simStore;
