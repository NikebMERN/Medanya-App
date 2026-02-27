// src/jobs/workers/scamAI.worker.js
const { Worker } = require("bullmq");
const { connection } = require("../queues/notification.queue");
const scamAIProvider = require("../../services/scamAI/scamAI.provider");
const scamAIStore = require("../../services/scamAI/scamAI.store");
const scamAIPolicy = require("../../services/scamAI/scamAI.policy");
const logger = require("../../utils/logger.util");
const { pool } = require("../../config/mysql");
const ModerationQueue = require("../../modules/unifiedReports/moderationQueue.model");

const DEEP_TIMEOUT_MS = parseInt(process.env.SCAM_AI_DEEP_TIMEOUT_MS, 10) || 5000;

async function processDeepScan(job) {
    const { targetType, targetId, userId, content } = job.data || {};
    if (!targetType || !targetId || !content) return;

    const table = targetType === "JOB" ? "jobs" : targetType === "MARKET" ? "marketplace_items" : null;
    const idCol = targetType === "JOB" ? "id" : "id";
    if (!table) return;

    const provider = scamAIProvider.getProvider();
    const aiResult = await scamAIProvider.runWithTimeout(provider, content, targetType === "MARKET" ? "MARKET" : "JOB", DEEP_TIMEOUT_MS);

    const scamProbability = aiResult.scamProbability ?? 0;
    const aiConfidence = aiResult.confidence ?? 0.5;
    const aiLabels = aiResult.labels || [];

    const ruleScore = 0;
    const policy = scamAIPolicy.applyPolicy(ruleScore, scamProbability, aiConfidence, aiLabels);

    const contentHash = scamAIStore.hashContent(content.title, content.description, content.location);
    await scamAIStore.insertLog({
        targetType: targetType === "MARKET" ? "MARKET" : "JOB",
        targetId: String(targetId),
        userId: userId || null,
        contentHash,
        aiProvider: aiResult.provider || "rules-only",
        aiScore: Math.round(scamProbability * 100),
        aiLabels,
        aiConfidence,
        decision: policy.decision,
    });

    await pool.query(
        `UPDATE ${table} SET ai_scam_score = ?, ai_scam_labels = ?, ai_confidence = ?, ai_provider = ?, ai_explanation = ? WHERE ${idCol} = ?`,
        [
            Math.round(scamProbability * 100),
            aiLabels.length ? JSON.stringify(aiLabels) : null,
            aiConfidence,
            aiResult.provider || "rules-only",
            (aiResult.explanation || "").slice(0, 160),
            targetId,
        ]
    );

    if (policy.decision === "PENDING_REVIEW" || policy.status === "PENDING_REVIEW") {
        const mqTargetType = targetType === "JOB" ? "JOB" : "MARKET_ITEM";
        const reasonSummary = `AI scam score ${Math.round(scamProbability * 100)} (${(aiLabels || []).join(", ") || "scam patterns"})`;
        await ModerationQueue.updateOne(
            { targetType: mqTargetType, targetId: String(targetId) },
            {
                $set: {
                    targetType: mqTargetType,
                    targetId: String(targetId),
                    priority: scamProbability >= 0.9 ? "URGENT" : "HIGH",
                    reasonSummary,
                    reportCount24h: 0,
                    status: "PENDING",
                    updatedAt: new Date(),
                },
            },
            { upsert: true }
        );
        await pool.query(`UPDATE ${table} SET status = 'PENDING_REVIEW' WHERE ${idCol} = ?`, [targetId]);
    }
}

function startScamAIWorker() {
    const worker = new Worker(
        "scamAIQueue",
        async (job) => {
            if (job.name === "deepScan") return processDeepScan(job);
            throw new Error("Unknown job name");
        },
        { connection }
    );

    worker.on("completed", (job) => logger.info(`scamAI worker done ${job.id}`));
    worker.on("failed", (job, err) => logger.error(`scamAI worker failed ${job?.id}`, err?.message));

    return worker;
}

module.exports = { startScamAIWorker };
