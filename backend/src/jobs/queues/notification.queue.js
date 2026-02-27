// src/jobs/queues/notification.queue.js
const { Queue } = require("bullmq");
const env = require("../../config/env");

const connection = {
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
    password: env.REDIS_PASSWORD || undefined,
};

const notificationQueue = new Queue("notificationQueue", { connection });
const scamAIQueue = new Queue("scamAIQueue", { connection });
const scamMLQueue = new Queue("scamMLQueue", { connection });

module.exports = { notificationQueue, scamAIQueue, scamMLQueue, connection };
