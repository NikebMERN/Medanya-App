// src/server.js
const http = require("http");
const app = require("./app");
const env = require("./config/env");

const connectMongo = require("./config/mongo");
const { testMySQLConnection } = require("./config/mysql");
const { connectRedis } = require("./config/redis");

const { Server } = require("socket.io");
const registerSockets = require("./sockets"); // src/sockets/index.js
const logger = require("./utils/logger.util");
const { startNotificationWorker } = require("./jobs/workers/notification.worker");
const { startMLInference, stopMLInference } = require("./services/ml/startMLInference");

const startServer = async () => {
    try {
        await connectMongo();
        await testMySQLConnection();
        await connectRedis();

        const server = http.createServer(app);

        const io = new Server(server, {
            cors: {
                origin: "*", // tighten in prod
                methods: ["GET", "POST"],
                credentials: false,
            },
            transports: ["websocket", "polling"],
            pingInterval: 25000,
            pingTimeout: 20000,
        });

        // Register Socket.IO middleware + base events (Step-5)
        registerSockets(io);

        // Start background workers
        startNotificationWorker();
        const { startScamAIWorker } = require("./jobs/workers/scamAI.worker");
        startScamAIWorker();
        const { startScamMLWorker } = require("./jobs/workers/scamML.worker");
        startScamMLWorker();

        const { scamMLQueue } = require("./jobs/queues/notification.queue");
        await scamMLQueue.add("autoLegitLabeling", {}, { repeat: { pattern: "0 2 * * *" } }).catch(() => {}); // daily 2am
        await scamMLQueue.add("activeLearningPick", {}, { repeat: { pattern: "0 4 * * *" } }).catch(() => {}); // daily 4am
        // Retrain: only when admin approves from panel (POST /admin/ml/approve-retrain). No automatic weekly request.

        startMLInference(); // ML inference runs with npm start

        const PORT = Number(env.PORT || 4001);
        server.listen(PORT, () => {
            logger.info(`🚀 Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        logger.error("❌ Server bootstrap failed", err);
        process.exit(1);
    }
};

startServer();

process.on("SIGTERM", () => stopMLInference());
process.on("SIGINT", () => stopMLInference());

