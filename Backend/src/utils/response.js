import ApiError from "./ApiError.js";

const VALID_SHIELDS = new Set(["voice", "job", "sim", "fusion"]);

/**
 * Derives risk level from numerical risk score.
 * <40 -> "low", 40 to 69 -> "medium", >=70 -> "high".
 * @param {number} score - Score between 0 and 100
 * @returns {"low" | "medium" | "high"}
 */
export const getRiskLevel = (score) => {
    if (score < 40) return "low";
    if (score < 70) return "medium";
    return "high";
};

/**
 * Builds normalized shield analysis result.
 * @param {Object} params
 * @param {"voice" | "job" | "sim" | "fusion"} params.shield
 * @param {number} params.riskScore
 * @param {Array<{name: string, score: number, detail?: string}>} [params.signals=[]]
 * @param {string} [params.aiExplanation=""]
 * @returns {Object} Normalized shield result object
 */
export const buildShieldResult = ({
    shield,
    riskScore,
    signals = [],
    aiExplanation = "",
}) => {
    if (!VALID_SHIELDS.has(shield)) {
        throw new ApiError(500, `Invalid shield identifier: ${shield}. Must be one of voice, job, sim, fusion.`);
    }

    const clampedScore = Math.round(Math.min(100, Math.max(0, Number(riskScore) || 0)));
    const level = getRiskLevel(clampedScore);

    const normalizedSignals = Array.isArray(signals)
        ? signals.map((sig) => ({
              name: String(sig?.name ?? ""),
              score: Math.round(Math.min(100, Math.max(0, Number(sig?.score) || 0))),
              detail: sig?.detail ? String(sig.detail) : "",
          }))
        : [];

    return {
        shield,
        riskScore: clampedScore,
        level,
        signals: normalizedSignals,
        aiExplanation: aiExplanation ? String(aiExplanation) : "",
        createdAt: new Date().toISOString(),
    };
};

/**
 * Sends a standard success JSON response.
 * @param {import("express").Response} res
 * @param {any} data
 * @param {string} [message="OK"]
 * @param {number} [statusCode=200]
 * @returns {import("express").Response}
 */
export const sendSuccess = (res, data, message = "OK", statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

/**
 * Builds a normalized shield result and sends it via sendSuccess.
 * @param {import("express").Response} res
 * @param {Object} shieldResultInput
 * @param {number} [statusCode=200]
 * @returns {import("express").Response}
 */
export const sendShieldResponse = (res, shieldResultInput, statusCode = 200) => {
    const result = buildShieldResult(shieldResultInput);
    return sendSuccess(res, result, "OK", statusCode);
};
