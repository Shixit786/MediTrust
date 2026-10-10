import ApiError from "../utils/ApiError.js";

/**
 * 404 Not Found middleware.
 */
export const notFound = (req, res, next) => {
    next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Global Error handling middleware.
 */
export const errorHandler = (err, req, res, next) => {
    let statusCode = 500;
    let message = "Internal server error";
    let details = null;
    let isOperational = false;

    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        message = err.message;
        details = err.details;
        isOperational = err.isOperational;
    } else if (
        err.type === "entity.parse.failed" ||
        (err instanceof SyntaxError && err.status === 400 && "body" in err)
    ) {
        statusCode = 400;
        message = "Invalid JSON body";
        isOperational = true;
    } else if (err.name === "ValidationError") {
        statusCode = 400;
        message = "Validation Error";
        isOperational = true;
        if (err.errors) {
            details = Object.keys(err.errors).reduce((acc, key) => {
                acc[key] = err.errors[key].message;
                return acc;
            }, {});
        }
    } else if (err.name === "CastError") {
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
        isOperational = true;
    } else if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue || {})[0] || "field";
        message = `Duplicate value for ${field}`;
        details = err.keyValue || null;
        isOperational = true;
    } else if (err.name === "MulterError") {
        statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        message = err.message || "File upload error";
        isOperational = true;
    } else {
        // Unexpected / non-operational error
        if (process.env.NODE_ENV !== "production") {
            message = err.message || "Internal server error";
        }
    }

    if (!isOperational) {
        console.error("Unexpected Error:", err);
    }

    const response = {
        success: false,
        message,
    };

    if (details !== null && details !== undefined) {
        response.details = details;
    }

    if (process.env.NODE_ENV !== "production" && err.stack) {
        response.stack = err.stack;
    }

    return res.status(statusCode).json(response);
};
