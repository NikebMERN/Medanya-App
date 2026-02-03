// src/config/redis.js
const redis = require("redis");
const env = require("./env");

const redisClient = redis.createClient({
    socket: {
        host: env.REDIS_HOST,
        port: Number(env.REDIS_PORT),
    },
    password: env.REDIS_PASSWORD || undefined,
});

redisClient.on("error", (err) => console.error("❌ Redis error:", err));
redisClient.on("connect", () => console.log("✅ Redis connected"));

const connectRedis = async () => {
    await redisClient.connect();
};

module.exports = { redisClient, connectRedis };
