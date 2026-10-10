import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";

import { apiLimiter } from "./middlewares/rateLimiter.middleware.js";
import healthRoutes from "./routes/health.routes.js";
import { notFound, errorHandler } from "./middlewares/error.middleware.js";

const app = express();

// a. Helmet security headers
app.use(helmet());

// b. CORS configuration
app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true,
    })
);

// c. HTTP request logging
app.use(morgan("dev"));

// d. Body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// e. Cookie parsing
app.use(cookieParser());

// f. Existing root route
app.get("/", (req, res) => {
    res.send("Hello from the backend");
});

// g. Rate limiter for /api
app.use("/api", apiLimiter);

// h. Health check route
app.use("/api/health", healthRoutes);

// Shield routes will be mounted here in later phases

// i. 404 handler
app.use(notFound);

// j. Global error handler (always last)
app.use(errorHandler);

export default app;
