import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, buildShieldResult } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { clampScore, levelFromScore } from '../utils/risk.js';
import { saveScan } from '../utils/saveScan.js';
import { evaluateFusionRules } from '../services/fusion/fusionRules.js';
import { buildAttackChain } from '../services/fusion/fusionChain.js';
import { buildPlaybook } from '../services/fusion/playbook.js';
import { getFusionAiExplanation } from '../services/fusion/fusionAi.service.js';
import { buildIncidentReport } from '../services/fusion/incidentReport.js';
import { getHistoryStats, getRecentScans } from '../services/fusion/history.service.js';
import { emitFusionUpdate } from '../sockets/index.js';

const PHONE_DIGIT_PATTERN = /\d{8,}/;

/**
 * Validates that no string in the object contains an 8+ digit run (potential phone numbers).
 */
function checkForPhonePatterns(obj, path = '') {
  if (!obj || typeof obj !== 'object') return;
  for (const [key, val] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (typeof val === 'string') {
      if (PHONE_DIGIT_PATTERN.test(val)) {
        throw ApiError.badRequest(
          `Field '${currentPath}' contains prohibited phone-like numeric sequences`,
          'VALIDATION_ERROR'
        );
      }
    } else if (typeof val === 'object' && val !== null) {
      checkForPhonePatterns(val, currentPath);
    }
  }
}

/**
 * Sanitizes untrusted client input into reliable ShieldIn objects.
 */
function sanitizeShieldIn(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.risk !== 'number' || Number.isNaN(raw.risk)) return null;

  const clamped = clampScore(raw.risk);
  const recomputedLevel = levelFromScore(clamped);

  const cleanSignals = (Array.isArray(raw.signals) ? raw.signals : [])
    .slice(0, 8)
    .map((s) => ({
      name: String(s?.name || '').trim().slice(0, 80),
      detail: String(s?.detail || '').trim().slice(0, 200),
      severity: ['low', 'medium', 'high', 'critical'].includes(s?.severity)
        ? s.severity
        : 'low',
    }));

  return {
    risk: clamped,
    level: recomputedLevel,
    threat: String(raw.threat || '').trim().slice(0, 80),
    confidence:
      typeof raw.confidence === 'number' && !Number.isNaN(raw.confidence)
        ? Math.min(1, Math.max(0, raw.confidence))
        : 0.5,
    signals: cleanSignals,
    emergency_claim: raw.emergency_claim
      ? {
          detected: Boolean(raw.emergency_claim.detected),
          escalated: Boolean(raw.emergency_claim.escalated),
        }
      : null,
    frozen: Boolean(raw.frozen),
  };
}

/**
 * Normalizes input shields for evaluation.
 */
function extractAndValidateInputs(body) {
  if (!body || typeof body !== 'object') {
    throw ApiError.badRequest(
      'At least one shield result must be provided for fusion evaluation',
      'NO_INPUT'
    );
  }

  checkForPhonePatterns(body);

  const voice = sanitizeShieldIn(body.voice);
  const job = sanitizeShieldIn(body.job);
  const sim = sanitizeShieldIn(body.sim);

  if (!voice && !job && !sim) {
    throw ApiError.badRequest(
      'At least one shield result must be provided for fusion evaluation',
      'NO_INPUT'
    );
  }

  return { voice, job, sim };
}

/**
 * POST /api/fusion/evaluate
 */
export const evaluateFusion = asyncHandler(async (req, res) => {
  const start = Date.now();
  const rawBody = req.validated?.body || req.body || {};
  const inputs = extractAndValidateInputs(rawBody);

  // 1. Evaluate Core Fusion Rules
  const evalRes = evaluateFusionRules(inputs);

  // 2. Build 4-Stage Attack Chain
  const chain = buildAttackChain({
    inputs,
    fusedRisk: evalRes.fusedRisk,
    activeCount: evalRes.activeCount,
  });

  // 3. Build Containment Playbook & Guardian Alert
  const playbook = buildPlaybook({
    inputs,
    fusedRisk: evalRes.fusedRisk,
    level: evalRes.level,
  });

  // 4. Generate AI Forensic Explanation
  const ai = await getFusionAiExplanation({
    fusedRisk: evalRes.fusedRisk,
    level: evalRes.level,
    threat: evalRes.threat,
    presentShields: evalRes.presentShields,
    chainStages: chain.stages,
    signals: evalRes.mergedSignals,
  });

  // 5. Emit Real-time Socket Update
  emitFusionUpdate({
    risk: evalRes.fusedRisk,
    level: evalRes.level,
    threat: evalRes.threat,
  });

  const elapsedMs = Date.now() - start;
  logger.info(
    `[Fusion Engine] route=evaluate coverage=${evalRes.coverage} level=${evalRes.level} elapsedMs=${elapsedMs}`
  );

  // 6. Fire-and-forget Persist to MongoDB
  saveScan({
    shield: 'fusion',
    risk: evalRes.fusedRisk,
    level: evalRes.level,
    threat: evalRes.threat,
    signals: evalRes.mergedSignals.slice(0, 5),
    summary: ai.summary_en.slice(0, 300),
  });

  // 7. Standardized Response matching React frontend contract
  const shieldResult = buildShieldResult({
    shield: 'fusion',
    risk: evalRes.fusedRisk,
    threat: evalRes.threat,
    confidence: evalRes.confidence,
    signals: evalRes.mergedSignals,
    extra: {
      coverage: evalRes.coverage,
      chain,
      chain_steps: chain.chain_steps, // frontend alias
      playbook,
      actions: playbook.steps.map((s) => s.title), // frontend alias
      guardianAlert: playbook.guardianAlert,
      inputs: {
        voice: inputs.voice ? { risk: inputs.voice.risk, level: inputs.voice.level } : null,
        job: inputs.job ? { risk: inputs.job.risk, level: inputs.job.level } : null,
        sim: inputs.sim ? { risk: inputs.sim.risk, level: inputs.sim.level } : null,
      },
      ai,
      explanation: ai.summary_en, // frontend alias
      overall_risk: evalRes.fusedRisk, // frontend alias
      pattern: evalRes.threat, // frontend alias
      disclaimer: evalRes.disclaimer,
      simulated_components: ['sim_guard', 'freeze', 'guardian_alert'],
    },
  });

  return ok(res, shieldResult);
});

/**
 * POST /api/fusion/report
 */
export const generateIncidentReport = asyncHandler(async (req, res) => {
  const start = Date.now();
  const rawBody = req.validated?.body || req.body || {};
  const inputs = extractAndValidateInputs(rawBody);

  const evalRes = evaluateFusionRules(inputs);
  const chain = buildAttackChain({
    inputs,
    fusedRisk: evalRes.fusedRisk,
    activeCount: evalRes.activeCount,
  });
  const playbook = buildPlaybook({
    inputs,
    fusedRisk: evalRes.fusedRisk,
    level: evalRes.level,
  });

  const incidentNote = rawBody.incidentNote || null;
  const report = buildIncidentReport({
    fusedRisk: evalRes.fusedRisk,
    level: evalRes.level,
    threat: evalRes.threat,
    chainStages: chain.stages,
    signals: evalRes.mergedSignals,
    playbookSteps: playbook.steps,
    incidentNote,
  });

  const elapsedMs = Date.now() - start;
  logger.info(`[Fusion Engine] route=report level=${evalRes.level} elapsedMs=${elapsedMs}`);

  return ok(res, report);
});

/**
 * GET /api/fusion/history/stats
 */
export const getHistoryStatsHandler = asyncHandler(async (_req, res) => {
  const stats = await getHistoryStats();
  return ok(res, stats);
});

/**
 * GET /api/fusion/history/recent
 */
export const getRecentScansHandler = asyncHandler(async (req, res) => {
  const limitParam = req.validated?.query?.limit ?? req.query?.limit;
  const limit = limitParam !== undefined ? parseInt(limitParam, 10) : 20;
  const scans = await getRecentScans(Number.isNaN(limit) ? 20 : limit);
  return ok(res, scans);
});

export default {
  evaluateFusion,
  generateIncidentReport,
  getHistoryStatsHandler,
  getRecentScansHandler,
};
