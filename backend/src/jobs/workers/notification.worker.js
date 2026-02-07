// src/jobs/workers/notification.worker.js
const { Worker } = require("bullmq");
const { connection } = require("../queues/notification.queue");
const service = require("../../modules/notifications/notification.service");
const logger = require("../../utils/logger.util");

function startNotificationWorker() {
    const worker = new Worker(
        "notificationQueue",
        async (job) => {
            const { type, payload } = job.data || {};
            if (type === "sendToUsers") return service._sendToUsersNow(payload);
            if (type === "sendToTopic") return service._sendToTopicNow(payload);
            throw new Error("Unknown job type");
        },
        { connection },
    );

    worker.on("completed", (job) =>
        logger.info(`✅ notification job done ${job.id}`),
    );
    worker.on("failed", (job, err) =>
        logger.error(`❌ notification job failed ${job?.id}`, err),
    );

    return worker;
}

module.exports = { startNotificationWorker };
