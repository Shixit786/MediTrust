import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";

import app from "./src/app.js";
import connectToDB from "./src/db/connectToDB.js";
import { config } from "./src/db/config.js";

const PORT = config.PORT || process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: CLIENT_URL,
        methods: ["GET", "POST"],
        credentials: true,
    },
});

app.set("io", io);

io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });
});

// Graceful shutdown
const shutdown = async (signal) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    try {
        io.close();
        if (server.closeAllConnections) {
            server.closeAllConnections();
        }
        server.close(async () => {
            console.log("HTTP server closed.");
            try {
                await mongoose.connection.close(false);
                console.log("MongoDB connection closed.");
            } catch (dbErr) {
                console.error("Error closing MongoDB connection:", dbErr);
            }
            process.exit(0);
        });
    } catch (err) {
        console.error("Error during graceful shutdown:", err);
        process.exit(1);
    }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Handle nodemon restarts cleanly
process.once("SIGUSR2", () => {
    try {
        io.close();
        if (server.closeAllConnections) {
            server.closeAllConnections();
        }
        server.close(() => {
            process.kill(process.pid, "SIGUSR2");
        });
    } catch {
        process.kill(process.pid, "SIGUSR2");
    }
});

process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);
});

server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Please stop the existing process.`);
    } else {
        console.error("Server error:", err);
    }
    process.exit(1);
});

// Connect to MongoDB first, then start listening
const startServer = async () => {
    await connectToDB();
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};

startServer();
