// src/modules/reports/listingReport.service.js
const ListingReport = require("./listingReport.model");
const jobDb = require("../jobs/job.mysql");
const marketDb = require("../marketplace/market.mysql");

function toId(x) {
    return x == null ? "" : String(x);
}

function err(code, message) {
    const e = new Error(message || code);
    e.code = code;
    return e;
}

const TARGET_TYPES = new Set(["job", "marketplace", "user"]);
const DUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour - no duplicate report same target

async function createListingReport(reporterId, body) {
    const reporter = toId(reporterId);
    if (!reporter) throw err("UNAUTHORIZED", "Auth required");

    const targetType = String(body.targetType || "").toLowerCase();
    if (!TARGET_TYPES.has(targetType))
        throw err("VALIDATION_ERROR", "targetType must be job, marketplace, or user");

    const targetId = toId(body.targetId);
    if (!targetId) throw err("VALIDATION_ERROR", "targetId required");

    const reason = String(body.reason || "").trim().slice(0, 100);
    const customReason = reason === "other" ? String(body.customReason || body.description || "").trim().slice(0, 500) : "";
    const description = String(body.description || "").trim().slice(0, 1000);
    const contextSourceUrl = String(body.contextSourceUrl || "").trim().slice(0, 500);
    const mediaUrls = Array.isArray(body.mediaUrls)
        ? body.mediaUrls.slice(0, 6).filter((u) => typeof u === "string")
        : [];

    // Duplicate check
    const windowStart = new Date(Date.now() - DUP_WINDOW_MS);
    const dup = await ListingReport.findOne({
        targetType,
        targetId,
        reporterId: reporter,
        createdAt: { $gte: windowStart },
    });
    if (dup) throw err("DUPLICATE_SPAM", "You recently reported this. Try later.");

    const doc = await ListingReport.create({
        targetType,
        targetId,
        reporterId: reporter,
        reason,
        customReason,
        description,
        mediaUrls,
        contextSourceUrl,
    });

    // Increment reports_count and maybe hide (job / marketplace only)
    const newCount = await ListingReport.countDocuments({
        targetType,
        targetId,
    });
    if (targetType === "job") {
        const job = await jobDb.findJobById(targetId);
        if (job) await jobDb.incrementReportsAndMaybeHide("job", targetId, newCount);
    } else if (targetType === "marketplace") {
        const item = await marketDb.findById(targetId);
        if (item) await marketDb.incrementReportsAndMaybeHide("marketplace", targetId, newCount);
    }
    // user reports: stored but no auto-hide (just for admin visibility)

    return doc.toObject();
}

async function countByTarget(targetType, targetId) {
    const c = await ListingReport.countDocuments({
        targetType: String(targetType),
        targetId: String(targetId),
    });
    return c;
}

module.exports = {
    createListingReport,
    countByTarget,
};
