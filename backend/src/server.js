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

