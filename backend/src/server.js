// src/server.js
const http = require("http");
const app = require("./app");
const env = require("./config/env");

const connectMongo = require("./config/mongo");
const { testMySQLConnection } = require("./config/mysql");
const { connectRedis } = require("./config/redis");

const { Server } = require("socket.io");

const startServer = async () => {
    try {
        // Connect all databases
        await connectMongo();
        await testMySQLConnection();
        await connectRedis();

        // HTTP server
        const server = http.createServer(app);

        // Socket.IO
        const io = new Server(server, {
            cors: { origin: "*" },
        });

        io.on("connection", (socket) => {
            console.log("🟢 Socket connected:", socket.id);

            socket.on("disconnect", () => {
                console.log("🔴 Socket disconnected:", socket.id);
            });
        });

        const PORT = Number(env.PORT);
        server.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}/api`);
        });
    } catch (err) {
        console.error("❌ Server bootstrap failed:", err);
        process.exit(1);
    }
};

startServer();
