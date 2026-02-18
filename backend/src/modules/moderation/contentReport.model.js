// Unified content reports: video | livestream | job | market | user
// Used for threshold logic: >=3 unique reporters in 24h triggers auto-action
const mongoose = require("mongoose");

const ContentReportSchema = new mongoose.Schema(
    {
        targetType: {
            type: String,
            enum: ["video", "livestream", "job", "market", "user"],
            required: true,
            index: true,
        },
        targetId: { type: String, required: true, index: true },
        reporterId: { type: String, required: true, index: true },
        reason: {
            type: String,
            enum: [
                // canonical reasons (Phase 6 videos + streams)
                "nudity",
                "sexual",
                "gore",
                "hate",
                "harassment",
                "scam",
                "child_safety",
                "other",
                // legacy groupings (older modules)
                "sexual_nudity",
                "gore_violence",
                "hate_harassment",
                "scam_fraud",
            ],
            default: "other",
            index: true,
        },
        note: { type: String, default: "" },
        status: { type: String, enum: ["pending", "reviewed"], default: "pending", index: true },
    },
    { timestamps: true },
);

// One report per reporter per target per 24h (anti-spam)
ContentReportSchema.index(
    { reporterId: 1, targetType: 1, targetId: 1, createdAt: -1 }
);
// Count unique reporters per target (for threshold)
ContentReportSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
ContentReportSchema.index({ targetType: 1, targetId: 1, reporterId: 1 }, { unique: false });

module.exports = mongoose.model("ContentReport", ContentReportSchema);
