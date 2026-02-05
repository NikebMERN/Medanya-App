// src/utils/notificationQueue.util.js
const { redisClient } = require("../config/redis");
const logger = require("./logger.util");

const QUEUE_KEY = "queue:notifications";

async function enqueueNotificationJob(jobName, payload) {
    // Best-effort: do not crash if Redis is down
    try {
        if (!redisClient || !redisClient.isOpen) return;

        const item = {
            jobName, // ex: "jobs:new"
            payload,
            createdAt: new Date().toISOString(),
        };

        await redisClient.rPush(QUEUE_KEY, JSON.stringify(item));
    } catch (err) {
        logger.warn("enqueueNotificationJob failed (non-fatal)");
    }
}

module.exports = {
    enqueueNotificationJob,
    QUEUE_KEY,
};
