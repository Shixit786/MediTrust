import mongoose from "mongoose";
import { sendSuccess } from "../utils/response.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * Health check handler reporting system status, uptime, and DB connectivity.
 */
export const getHealth = asyncHandler(async (req, res) => {
    const readyState = mongoose.connection.readyState;
    let database = "disconnected";
    if (readyState === 1) {
        database = "connected";
    } else if (readyState === 2) {
        database = "connecting";
    }

    const healthData = {
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        database,
    };

    return sendSuccess(res, healthData, "OK", 200);
});
