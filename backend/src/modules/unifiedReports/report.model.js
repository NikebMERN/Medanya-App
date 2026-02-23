// src/modules/unifiedReports/report.model.js
const mongoose = require("mongoose");

const TARGET_TYPES = ["JOB", "MARKET_ITEM", "MISSING_PERSON", "VIDEO", "LIVESTREAM", "USER"];
const REASONS = ["SCAM_FRAUD", "HARASSMENT", "HATE", "NUDITY_SEXUAL", "GORE_VIOLENCE", "CHILD_SAFETY", "SPAM", "OTHER"];
const STATUSES = ["OPEN", "RESOLVED", "DISMISSED"];

const ReportSchema = new mongoose.Schema(
    {
        targetType: { type: String, enum: TARGET_TYPES, required: true, index: true },
        targetId: { type: String, required: true, index: true },
        reporterId: { type: String, required: true, index: true },
        reason: { type: String, enum: REASONS, required: true, default: "OTHER" },
        description: { type: String, default: "" },
        mediaUrls: { type: [String], default: [] },
        status: { type: String, enum: STATUSES, default: "OPEN", index: true },
        dedupeKey: { type: String, required: true, index: true },
        adminActionTaken: { type: String, default: "" },
    },
    { timestamps: true },
);

ReportSchema.index({ dedupeKey: 1 });
ReportSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
ReportSchema.index({ reporterId: 1, createdAt: -1 });

module.exports = mongoose.model("UnifiedReport", ReportSchema);
module.exports.TARGET_TYPES = TARGET_TYPES;
module.exports.REASONS = REASONS;
module.exports.STATUSES = STATUSES;
