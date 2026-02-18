/**
 * Report threshold logic: >=3 unique reporters in 24h triggers auto-action.
 * Severe reasons (child_safety, gore_violence): 1 report -> immediate hide + notify.
 */
const mongoose = require("mongoose");
const ContentReport = require("../modules/moderation/contentReport.model");
const Video = require("../modules/videos/video.model");
const Stream = require("../modules/livestream/stream.model");
const logger = require("../utils/logger.util");

function toObjectId(id) {
    if (!id) return null;
    if (typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id)) return new mongoose.Types.ObjectId(id);
    return id;
}

const THRESHOLD_NORMAL = 3;
const THRESHOLD_SEVERE = 1;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

function normalizeReason(reason) {
    const r = String(reason || "other").trim().toLowerCase();
    // Map common UI/admin values to canonical
    if (["child", "child_safety", "child-safety", "child safety"].includes(r)) return "child_safety";
    if (["gore", "violence", "extreme_gore", "gore_violence", "gore-violence"].includes(r)) return "gore";
    if (["nudity"].includes(r)) return "nudity";
    if (["sexual", "sex"].includes(r)) return "sexual";
    if (["hate"].includes(r)) return "hate";
    if (["harassment"].includes(r)) return "harassment";
    if (["scam", "fraud", "scam_fraud"].includes(r)) return "scam";
    return "other";
}

const SEVERE_REASONS = new Set(["child_safety", "gore", "gore_violence"]);

async function countUniqueReportersLast24h(targetType, targetId) {
    const since = new Date(Date.now() - WINDOW_MS);
    const docs = await ContentReport.distinct("reporterId", {
        targetType,
        targetId,
        createdAt: { $gte: since },
    });
    return docs.length;
}

async function getReportReasonsSummary(targetType, targetId) {
    const since = new Date(Date.now() - WINDOW_MS);
    const reports = await ContentReport.aggregate([
        { $match: { targetType, targetId, createdAt: { $gte: since } } },
        { $group: { _id: "$reason", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);
    return reports;
}

/**
 * Create report and check thresholds; trigger auto-actions if needed.
 * Returns { created, uniqueCount24h, triggered, message }.
 */
async function createReportAndCheckThreshold({ targetType, targetId, reporterId, reason }) {
    const reasonNorm = normalizeReason(reason);
    const existing = await ContentReport.findOne({
        targetType,
        targetId,
        reporterId,
        createdAt: { $gte: new Date(Date.now() - WINDOW_MS) },
    });
    if (existing) {
        const count = await countUniqueReportersLast24h(targetType, targetId);
        return { created: false, uniqueCount24h: count, triggered: false, message: "Already reported in last 24h" };
    }

    await ContentReport.create({
        targetType,
        targetId,
        reporterId,
        reason: reasonNorm,
    });

    const uniqueCount = await countUniqueReportersLast24h(targetType, targetId);
    const isSevere = SEVERE_REASONS.has(reasonNorm);
    const hitThreshold = isSevere ? uniqueCount >= THRESHOLD_SEVERE : uniqueCount >= THRESHOLD_NORMAL;

    if (hitThreshold) {
        if (targetType === "video") {
            const vid = toObjectId(targetId);
            if (vid) await Video.updateOne(
                { _id: vid },
                { $set: { status: "HIDDEN_PENDING_REVIEW", moderationNote: "Auto-hidden: report threshold reached", reportCount: uniqueCount } },
            ).catch((e) => logger.error("reportThreshold: video update error", e));
        }
        if (targetType === "livestream") {
            const sid = toObjectId(targetId);
            if (sid) await Stream.updateOne(
                { _id: sid },
                {
                    $set: {
                        status: "stopped_pending_review",
                        reportCount: uniqueCount,
                        lastReportAt: new Date(),
                    },
                },
            ).catch((e) => logger.error("reportThreshold: stream update error", e));
        }
        return {
            created: true,
            uniqueCount24h: uniqueCount,
            triggered: true,
            message: isSevere ? "Content hidden immediately (severe reason)" : "Content hidden (threshold reached)",
        };
    }

    // update reportCount for video/stream for easier moderation UI
    if (targetType === "video") {
        const vid = toObjectId(targetId);
        if (vid) await Video.updateOne({ _id: vid }, { $set: { reportCount: uniqueCount } }).catch(() => {});
    }
    if (targetType === "livestream") {
        const sid = toObjectId(targetId);
        if (sid) await Stream.updateOne(
            { _id: sid },
            { $set: { reportCount: uniqueCount, lastReportAt: new Date() } },
        ).catch(() => {});
    }
    return { created: true, uniqueCount24h: uniqueCount, triggered: false, message: "Report recorded" };
}

module.exports = {
    countUniqueReportersLast24h,
    getReportReasonsSummary,
    createReportAndCheckThreshold,
    THRESHOLD_NORMAL,
    THRESHOLD_SEVERE,
    SEVERE_REASONS,
};
