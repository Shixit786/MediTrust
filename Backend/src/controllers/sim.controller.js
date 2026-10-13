import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, buildShieldResult } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { saveScan } from '../utils/saveScan.js';
import { simStore } from '../services/sim/simStore.js';
import {
  evaluateSimRisk,
  createSimEvent,
  EVENT_CATALOGUE,
} from '../services/sim/simRules.js';
import {
  getSimAiExplanation,
  getFastSimTemplateSummary,
} from '../services/sim/simAi.service.js';
import {
  emitSimEvent,
  emitSimState,
  emitSimFreeze,
  emitSimGuardian,
  emitSimReset,
} from '../sockets/index.js';

const DISCLAIMER_TEXT =
  'Simulated demo. Real SIM-swap detection needs telecom operator integration. Early warning, not proof.';

const ALLOWED_SIM_TYPES = [
  ...Object.keys(EVENT_CATALOGUE),
  'full_chain',
];

const FULL_CHAIN_SEQUENCE = [
  { type: 'new_device_login', delayMs: 0 },
  { type: 'sim_swap', delayMs: 2000 },
  { type: 'call_forwarding', delayMs: 4000 },
  { type: 'otp_flood', delayMs: 6000 },
];

/**
 * Builds compact serializable state payload for a profile.
 */
function buildStatePayload(profile, evalRes) {
  const isConfirmed = profile.frozen || evalRes.riskScore >= 60;
  const status = profile.frozen
    ? 'frozen'
    : evalRes.riskScore >= 60
    ? 'confirmed'
    : evalRes.riskScore >= 25
    ? 'anomaly'
    : 'normal';

  return {
    phoneMasked: profile.phoneMasked,
    simNumber: profile.phoneMasked,
    status,
    monitoringStatus: 'MONITORING',
    riskScore: evalRes.riskScore,
    level: evalRes.level,
    threat: evalRes.threat,
    signals: evalRes.signals,
    events: profile.events,
    frozen: profile.frozen,
    freezeAt: profile.freezeAt,
    guardianAlerted: profile.guardianAlerted,
    trustedContactAlerted: profile.guardianAlerted,
    guardian: profile.guardian,
    simulated: true,
    disclaimer: DISCLAIMER_TEXT,
  };
}

/**
 * POST /api/sim/register
 * Body: { phone, guardianName? }
 */
export const registerSim = asyncHandler(async (req, res) => {
  const start = Date.now();
  const body = req.validated?.body || req.body || {};
  const { phone, guardianName } = body;

  const profile = simStore.register(phone, guardianName);
  const elapsedMs = Date.now() - start;

  logger.info(`[SIM Guard] route=register level=low elapsedMs=${elapsedMs}`);

  return ok(
    res,
    {
      phoneMasked: profile.phoneMasked,
      simNumber: profile.phoneMasked,
      status: 'MONITORING',
      riskScore: 0,
      level: 'low',
      simulated: true,
      disclaimer: DISCLAIMER_TEXT,
      guardian: profile.guardian,
    },
    201
  );
});

/**
 * GET /api/sim/:phone
 */
export const getSimByPhone = asyncHandler(async (req, res) => {
  const start = Date.now();
  const phone = req.validated?.params?.phone || req.params.phone;

  const profile = simStore.get(phone);
  if (!profile) {
    throw ApiError.notFound('Number is not registered for monitoring', 'NOT_FOUND');
  }

  const evalRes = evaluateSimRisk(profile.events);
  profile.riskScore = evalRes.riskScore;
  profile.level = evalRes.level;
  profile.threat = evalRes.threat;

  const ai = await getSimAiExplanation({
    events: profile.events,
    riskScore: evalRes.riskScore,
    level: evalRes.level,
    threat: evalRes.threat,
    frozen: profile.frozen,
    signals: evalRes.signals,
  });

  const state = buildStatePayload(profile, evalRes);
  const elapsedMs = Date.now() - start;

  logger.info(`[SIM Guard] route=get level=${evalRes.level} elapsedMs=${elapsedMs}`);

  const shieldResult = buildShieldResult({
    shield: 'sim',
    risk: evalRes.riskScore,
    threat: evalRes.threat,
    confidence: evalRes.riskScore >= 60 ? 0.98 : 0.94,
    signals: evalRes.signals,
    extra: {
      ...state,
      ai,
    },
  });

  return ok(res, shieldResult);
});

/**
 * POST /api/sim/simulate/:type
 * Body: { phone }
 */
export const simulateSimEvent = asyncHandler(async (req, res) => {
  const start = Date.now();
  const type = req.validated?.params?.type || req.params.type;
  const phone = req.validated?.body?.phone || req.body.phone;

  if (!ALLOWED_SIM_TYPES.includes(type)) {
    throw ApiError.badRequest(
      `Unknown simulation event type '${type}'. Allowed types: ${ALLOWED_SIM_TYPES.join(', ')}`,
      'VALIDATION_ERROR'
    );
  }

  const profile = simStore.get(phone);
  if (!profile) {
    throw ApiError.notFound('Number is not registered for monitoring', 'NOT_FOUND');
  }

  const phoneHash = simStore.getHash(phone);

  if (type === 'full_chain') {
    // Clear any previous scheduled timers
    simStore.clearTimers(phone);

    // Step 0: Execute immediately at 0s
    const firstEvent = createSimEvent(FULL_CHAIN_SEQUENCE[0].type);
    simStore.appendEvent(phone, firstEvent);
    let evalRes = evaluateSimRisk(profile.events);
    simStore.updateRisk(phone, evalRes);

    let state = buildStatePayload(profile, evalRes);
    emitSimEvent(phoneHash, {
      event: firstEvent,
      riskScore: evalRes.riskScore,
      level: evalRes.level,
      threat: evalRes.threat,
    });
    emitSimState(phoneHash, state);

    // Schedule remaining steps in sequence
    for (let i = 1; i < FULL_CHAIN_SEQUENCE.length; i++) {
      const step = FULL_CHAIN_SEQUENCE[i];
      const timerHandle = setTimeout(() => {
        const currentProfile = simStore.get(phone);
        if (!currentProfile) return;

        const nextEvent = createSimEvent(step.type);
        simStore.appendEvent(phone, nextEvent);
        const nextEval = evaluateSimRisk(currentProfile.events);
        simStore.updateRisk(phone, nextEval);

        const nextState = buildStatePayload(currentProfile, nextEval);
        emitSimEvent(phoneHash, {
          event: nextEvent,
          riskScore: nextEval.riskScore,
          level: nextEval.level,
          threat: nextEval.threat,
        });
        // TODO: Fusion engine will subscribe to these SIM state changes in a future event bus
        emitSimState(phoneHash, nextState);

        const fastSummary = getFastSimTemplateSummary({
          riskScore: nextEval.riskScore,
          level: nextEval.level,
          threat: nextEval.threat,
          signals: nextEval.signals,
          frozen: currentProfile.frozen,
        });

        // Fire-and-forget saveScan
        saveScan({
          shield: 'sim',
          risk: nextEval.riskScore,
          level: nextEval.level,
          threat: nextEval.threat,
          signals: nextEval.signals.slice(0, 5),
          summary: fastSummary.slice(0, 300),
        });
      }, step.delayMs);

      if (timerHandle.unref) {
        timerHandle.unref();
      }
      simStore.addTimer(phone, timerHandle);
    }

    const ai = await getSimAiExplanation({
      events: profile.events,
      riskScore: evalRes.riskScore,
      level: evalRes.level,
      threat: evalRes.threat,
      frozen: profile.frozen,
      signals: evalRes.signals,
    });

    const elapsedMs = Date.now() - start;
    logger.info(`[SIM Guard] route=simulate:full_chain level=${evalRes.level} elapsedMs=${elapsedMs}`);

    // Fire-and-forget saveScan for initial step
    saveScan({
      shield: 'sim',
      risk: evalRes.riskScore,
      level: evalRes.level,
      threat: evalRes.threat,
      signals: evalRes.signals.slice(0, 5),
      summary: ai.summary_en.slice(0, 300),
    });

    const shieldResult = buildShieldResult({
      shield: 'sim',
      risk: evalRes.riskScore,
      threat: evalRes.threat,
      confidence: evalRes.riskScore >= 60 ? 0.98 : 0.94,
      signals: evalRes.signals,
      extra: {
        ...state,
        lastEvent: firstEvent,
        scheduled: FULL_CHAIN_SEQUENCE.length - 1,
        ai,
      },
    });

    return ok(res, shieldResult);
  }

  // Single event simulation
  const newEvent = createSimEvent(type);
  simStore.appendEvent(phone, newEvent);

  const evalRes = evaluateSimRisk(profile.events);
  simStore.updateRisk(phone, evalRes);

  const state = buildStatePayload(profile, evalRes);

  // Instant socket updates
  emitSimEvent(phoneHash, {
    event: newEvent,
    riskScore: evalRes.riskScore,
    level: evalRes.level,
    threat: evalRes.threat,
  });
  emitSimState(phoneHash, state);

  // Fetch AI explanation for REST response
  const ai = await getSimAiExplanation({
    events: profile.events,
    riskScore: evalRes.riskScore,
    level: evalRes.level,
    threat: evalRes.threat,
    frozen: profile.frozen,
    signals: evalRes.signals,
  });

  const elapsedMs = Date.now() - start;
  logger.info(`[SIM Guard] route=simulate:${type} level=${evalRes.level} elapsedMs=${elapsedMs}`);

  // Fire-and-forget saveScan
  saveScan({
    shield: 'sim',
    risk: evalRes.riskScore,
    level: evalRes.level,
    threat: evalRes.threat,
    signals: evalRes.signals.slice(0, 5),
    summary: ai.summary_en.slice(0, 300),
  });

  const shieldResult = buildShieldResult({
    shield: 'sim',
    risk: evalRes.riskScore,
    threat: evalRes.threat,
    confidence: evalRes.riskScore >= 60 ? 0.98 : 0.94,
    signals: evalRes.signals,
    extra: {
      ...state,
      lastEvent: newEvent,
      ai,
    },
  });

  return ok(res, shieldResult);
});

/**
 * POST /api/sim/freeze
 * Body: { phone }
 */
export const freezeSim = asyncHandler(async (req, res) => {
  const start = Date.now();
  const phone = req.validated?.body?.phone || req.body.phone;

  const profile = simStore.get(phone);
  if (!profile) {
    throw ApiError.notFound('Number is not registered for monitoring', 'NOT_FOUND');
  }

  simStore.setFrozen(phone, true);
  const evalRes = evaluateSimRisk(profile.events);
  const phoneHash = simStore.getHash(phone);
  const state = buildStatePayload(profile, evalRes);

  emitSimFreeze(phoneHash, {
    phoneMasked: profile.phoneMasked,
    frozen: true,
  });
  emitSimState(phoneHash, state);

  const elapsedMs = Date.now() - start;
  logger.info(`[SIM Guard] route=freeze level=${evalRes.level} elapsedMs=${elapsedMs}`);

  // Fire-and-forget saveScan on freeze
  saveScan({
    shield: 'sim',
    risk: evalRes.riskScore,
    level: evalRes.level,
    threat: evalRes.threat,
    signals: evalRes.signals.slice(0, 5),
    summary: 'Automated Freeze Protocol engaged: outgoing OTP delivery blocked.'.slice(0, 300),
  });

  return ok(res, {
    phoneMasked: profile.phoneMasked,
    simNumber: profile.phoneMasked,
    frozen: true,
    simulated: true,
    steps: [
      'Block outgoing OTP delivery',
      'Pause SIM swap requests',
      'Notify bank fraud desk',
    ],
    note: 'Demonstration only. A real freeze needs bank and telecom permission.',
  });
});

/**
 * POST /api/sim/guardian-alert
 * Body: { phone }
 */
export const alertGuardian = asyncHandler(async (req, res) => {
  const start = Date.now();
  const phone = req.validated?.body?.phone || req.body.phone;

  const profile = simStore.get(phone);
  if (!profile) {
    throw ApiError.notFound('Number is not registered for monitoring', 'NOT_FOUND');
  }

  if (!profile.guardian || !profile.guardian.name) {
    throw ApiError.conflict('No guardian contact configured for this number', 'NO_GUARDIAN');
  }

  simStore.setGuardianAlerted(phone, true);
  const evalRes = evaluateSimRisk(profile.events);
  const phoneHash = simStore.getHash(phone);
  const state = buildStatePayload(profile, evalRes);

  emitSimGuardian(phoneHash, {
    phoneMasked: profile.phoneMasked,
    guardian: profile.guardian,
  });
  emitSimState(phoneHash, state);

  const elapsedMs = Date.now() - start;
  logger.info(`[SIM Guard] route=guardian-alert level=${evalRes.level} elapsedMs=${elapsedMs}`);

  return ok(res, {
    to: profile.guardian.name,
    message: `EMERGENCY ALERT: Elevated telecom risk detected on monitored line ${profile.phoneMasked} (Risk Level: ${evalRes.level.toUpperCase()}). Please verify account owner safety immediately.`,
    simulated: true,
  });
});

/**
 * POST /api/sim/reset
 * Body: { phone? }
 */
export const resetSim = asyncHandler(async (req, res) => {
  const start = Date.now();
  const body = req.validated?.body || req.body || {};
  const { phone } = body;

  if (phone) {
    const profile = simStore.get(phone);
    if (!profile) {
      throw ApiError.notFound('Number is not registered for monitoring', 'NOT_FOUND');
    }

    simStore.reset(phone);
    const evalRes = evaluateSimRisk([]);
    const phoneHash = simStore.getHash(phone);
    const state = buildStatePayload(profile, evalRes);

    emitSimReset(phoneHash, { phoneMasked: profile.phoneMasked });
    emitSimState(phoneHash, state);

    const elapsedMs = Date.now() - start;
    logger.info(`[SIM Guard] route=reset:phone level=low elapsedMs=${elapsedMs}`);

    return ok(res, {
      phoneMasked: profile.phoneMasked,
      simNumber: profile.phoneMasked,
      reset: true,
      simulated: true,
    });
  }

  // Global reset without phone
  if ((process.env.NODE_ENV || env.NODE_ENV) === 'production') {
    throw ApiError.forbidden(
      'Global reset is only permitted in non-production environments',
      'FORBIDDEN'
    );
  }

  simStore.clearAll();
  const elapsedMs = Date.now() - start;
  logger.info(`[SIM Guard] route=reset:all level=low elapsedMs=${elapsedMs}`);

  return ok(res, {
    allReset: true,
    simulated: true,
  });
});

export default {
  registerSim,
  getSimByPhone,
  simulateSimEvent,
  freezeSim,
  alertGuardian,
  resetSim,
};
