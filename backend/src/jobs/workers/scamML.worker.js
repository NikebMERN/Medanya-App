// src/jobs/workers/scamML.worker.js
const { Worker } = require("bullmq");
const { connection } = require("../queues/notification.queue");
const { pool } = require("../../config/mysql");
const scamTraining = require("../../services/scamML/scamTraining.mysql");
const ModerationQueue = require("../../modules/unifiedReports/moderationQueue.model");
const logger = require("../../utils/logger.util");

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function processAutoLegitLabeling() {
    const since = new Date(Date.now() - SEVEN_DAYS_MS);
    const [jobs] = await pool.query(
        `SELECT id FROM jobs WHERE status = 'active' AND reports_count = 0 AND created_at <= ?`,
        [since]
    );
    const [items] = await pool.query(
        `SELECT id FROM marketplace_items WHERE status = 'active' AND reports_count = 0 AND created_at <= ?`,
        [since]
    );

    let updated = 0;
    for (const row of jobs) {
        const n = await scamTraining.updateFinalLabel("JOB", row.id, "LEGIT", "AUTO_SURVIVED_7D");
        if (n) updated += 1;
    }
    for (const row of items) {
        const n = await scamTraining.updateFinalLabel("MARKET", row.id, "LEGIT", "AUTO_SURVIVED_7D");
        if (n) updated += 1;
    }
    logger.info(`scamML: auto-legit labeled ${updated} samples`);
    return { updated };
}

async function processWeeklyTraining() {
    const labeledCount = await scamTraining.getLabeledCount();
    const scamML = require("../../services/scamML/scamML.service");
    const minLabels = scamML.getMinLabelsForML ? scamML.getMinLabelsForML() : 200;
    if (labeledCount < minLabels) {
        logger.info(`scamML: training skipped, ${labeledCount} labels (need ${minLabels})`);
        return { skipped: true, labeledCount };
    }
    const mlTrainScript = process.env.ML_TRAIN_SCRIPT || "python ml/train.py";
    const { spawn } = require("child_process");
    return new Promise((resolve) => {
        const child = spawn(mlTrainScript.split(" ")[0], mlTrainScript.split(" ").slice(1), { cwd: process.cwd() });
        child.on("exit", (code) => {
            logger.info(`scamML: training finished with code ${code}`);
            resolve({ trained: code === 0 });
        });
        child.on("error", (e) => {
            logger.error("scamML: training error", e.message);
            resolve({ trained: false, error: e.message });
        });
    });
}

async function processActiveLearningPick() {
    const [jobRows] = await pool.query(
        `SELECT s.target_type, s.target_id FROM scam_training_samples s
         JOIN jobs j ON s.target_type = 'JOB' AND s.target_id = j.id
         WHERE s.final_label IS NULL AND j.ml_score BETWEEN 45 AND 55 LIMIT 10`
    );
    const [marketRows] = await pool.query(
        `SELECT s.target_type, s.target_id FROM scam_training_samples s
         JOIN marketplace_items m ON s.target_type = 'MARKET' AND s.target_id = m.id
         WHERE s.final_label IS NULL AND m.ml_score BETWEEN 45 AND 55 LIMIT 10`
    );
    const rows = [...jobRows, ...marketRows];
    for (const row of rows) {
        const mqTargetType = row.target_type === "JOB" ? "JOB" : "MARKET_ITEM";
        await ModerationQueue.updateOne(
            { targetType: mqTargetType, targetId: String(row.target_id) },
            {
                $set: {
                    targetType: mqTargetType,
                    targetId: String(row.target_id),
                    priority: "NORMAL",
                    reasonSummary: `Active learning: ML uncertain (score ~50). Needs label.`,
                    reportCount24h: 0,
                    status: "PENDING",
                    updatedAt: new Date(),
                },
            },
            { upsert: true }
        );
    }
    logger.info(`scamML: active learning queued ${rows.length} samples`);
    return { queued: rows.length };
}

function startScamMLWorker() {
    const worker = new Worker(
        "scamMLQueue",
        async (job) => {
            if (job.name === "autoLegitLabeling") return processAutoLegitLabeling();
            if (job.name === "weeklyTraining") return processWeeklyTraining();
            if (job.name === "activeLearningPick") return processActiveLearningPick();
            throw new Error("Unknown job name");
        },
        { connection }
    );

    worker.on("completed", (job) => logger.info(`scamML worker done ${job.id}`));
    worker.on("failed", (job, err) => logger.error(`scamML worker failed ${job?.id}`, err?.message));

    return worker;
}

module.exports = { startScamMLWorker };
