// src/modules/unifiedReports/report.service.js
const mongoose = require("mongoose");
const { pool } = require("../../config/mysql");
const Report = require("./report.model");
const ModerationQueue = require("./moderationQueue.model");
const Video = require("../videos/video.model");
const Stream = require("../livestream/stream.model");
const MissingPerson = require("../missingPersons/missing.model");
const logger = require("../../utils/logger.util");

const DUP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
const THRESHOLD_NORMAL = 3;
const SEVERE_REASONS = new Set(["CHILD_SAFETY", "GORE_VIOLENCE"]);

const TARGET_MAP = {
    job: "JOB",
    jobs: "JOB",
    market_item: "MARKET_ITEM",
    marketplace: "MARKET_ITEM",
    market: "MARKET_ITEM",
    missing_person: "MISSING_PERSON",
    missing_persons: "MISSING_PERSON",
    video: "VIDEO",
    videos: "VIDEO",
    livestream: "LIVESTREAM",
    stream: "LIVESTREAM",
    streams: "LIVESTREAM",
    user: "USER",
    users: "USER",
};

function toId(x) {
    return x == null ? "" : String(x);
}

function err(code, message) {
    const e = new Error(message || code);
    e.code = code;
    return e;
}

function normalizeTargetType(val) {
    const k = String(val || "").toLowerCase().replace(/-/g, "_");
    return TARGET_MAP[k] || (Report.TARGET_TYPES.includes(String(val).toUpperCase()) ? String(val).toUpperCase() : null);
}

function toObjectId(id) {
    if (!id) return null;
    if (typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id)) return new mongoose.Types.ObjectId(id);
    return id;
}

async function countUniqueReporters24h(targetType, targetId) {
    const since = new Date(Date.now() - DUP_WINDOW_MS);
    const ids = await Report.distinct("reporterId", {
        targetType,
        targetId: toId(targetId),
        createdAt: { $gte: since },
    });
    return ids.length;
}

async function getReasonSummary(targetType, targetId) {
    const since = new Date(Date.now() - DUP_WINDOW_MS);
    const reports = await Report.aggregate([
        { $match: { targetType, targetId: toId(targetId), createdAt: { $gte: since } } },
        { $group: { _id: "$reason", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
    ]);
    return reports.map((r) => `${r._id}:${r.count}`).join(", ");
}

async function createReport(reporterId, body) {
    const reporter = toId(reporterId);
    if (!reporter) throw err("UNAUTHORIZED", "Auth required");

    const targetType = normalizeTargetType(body.targetType);
    if (!targetType) throw err("VALIDATION_ERROR", "targetType must be JOB, MARKET_ITEM, MISSING_PERSON, VIDEO, LIVESTREAM, or USER");

    const targetId = toId(body.targetId);
    if (!targetId) throw err("VALIDATION_ERROR", "targetId required");

    const reason = Report.REASONS.includes(String(body.reason || "OTHER").toUpperCase())
        ? String(body.reason).toUpperCase()
        : "OTHER";

    const description = String(body.description || "").trim().slice(0, 1000);
    const mediaUrls = Array.isArray(body.mediaUrls)
        ? body.mediaUrls.slice(0, 6).filter((u) => typeof u === "string")
        : [];

    const dedupeKey = `${reporter}:${targetType}:${targetId}`;
    const windowStart = new Date(Date.now() - DUP_WINDOW_MS);

    const existing = await Report.findOne({
        dedupeKey,
        createdAt: { $gte: windowStart },
    });
    if (existing) throw err("DUPLICATE_SPAM", "You already reported this in the last 24 hours.");

    const doc = await Report.create({
        targetType,
        targetId,
        reporterId: reporter,
        reason,
        description,
        mediaUrls,
        status: "OPEN",
        dedupeKey,
    });

    const uniqueCount24h = await countUniqueReporters24h(targetType, targetId);
    const isSevere = SEVERE_REASONS.has(reason);
    const shouldHide = uniqueCount24h >= THRESHOLD_NORMAL || (isSevere && uniqueCount24h >= 1);

    let triggered = false;
    const priority = isSevere ? "URGENT" : uniqueCount24h >= THRESHOLD_NORMAL ? "HIGH" : "NORMAL";

    // Update reportCount/reports_count on target
    if (targetType === "JOB") {
        await pool.query(
            `UPDATE jobs SET reports_count = ? ${shouldHide ? ", status = 'HIDDEN_PENDING_REVIEW'" : ""} WHERE id = ?`,
            [uniqueCount24h, targetId],
        );
    } else if (targetType === "MARKET_ITEM") {
        await pool.query(
            `UPDATE marketplace_items SET reports_count = ? ${shouldHide ? ", status = 'HIDDEN_PENDING_REVIEW'" : ""} WHERE id = ?`,
            [uniqueCount24h, targetId],
        );
    } else if (targetType === "VIDEO") {
        const vid = toObjectId(targetId);
        if (vid) {
            const update = { reportCount: uniqueCount24h };
            if (shouldHide) {
                update.status = "HIDDEN_PENDING_REVIEW";
                update.moderationNote = "Auto-hidden: report threshold reached";
            }
            await Video.updateOne({ _id: vid }, { $set: update }).catch((e) => logger.error("unifiedReports: video update error", e));
        }
    } else if (targetType === "LIVESTREAM") {
        const sid = toObjectId(targetId);
        if (sid) {
            const update = { reportCount: uniqueCount24h, lastReportAt: new Date() };
            if (shouldHide) update.status = "stopped_pending_review";
            await Stream.updateOne({ _id: sid }, { $set: update }).catch((e) => logger.error("unifiedReports: stream update error", e));
            triggered = shouldHide;
        }
    } else if (targetType === "MISSING_PERSON") {
        const mid = toObjectId(targetId);
        if (mid && shouldHide) {
            await MissingPerson.updateOne({ _id: mid }, { $set: { status: "pending_review" } }).catch((e) =>
                logger.error("unifiedReports: missing person update error", e),
            );
        }
    }
    // USER: no auto-hide, only moderation queue

    if (shouldHide) {
        const reasonSummary = await getReasonSummary(targetType, targetId);
        await ModerationQueue.updateOne(
            { targetType, targetId },
            {
                $set: {
                    targetType,
                    targetId,
                    priority,
                    reasonSummary,
                    reportCount24h: uniqueCount24h,
                    status: "PENDING",
                    updatedAt: new Date(),
                },
            },
            { upsert: true },
        );
    }

    return {
        report: doc.toObject(),
        uniqueCount24h,
        triggered,
        targetType: triggered ? targetType : undefined,
        targetId: triggered ? targetId : undefined,
    };
}

module.exports = {
    createReport,
    countUniqueReporters24h,
};
