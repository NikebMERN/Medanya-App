// src/modules/videos/video.model.js
const mongoose = require("mongoose");

/**
 * Primary video document (MongoDB).
 * Scalable design: likes/comments are stored in separate collections.
 * Backward-compat: we still allow legacy statuses, but new code uses
 * ACTIVE | PENDING_REVIEW | HIDDEN_PENDING_REVIEW | DELETED.
 */
const VideoSchema = new mongoose.Schema(
    {
        // uploaderId (MySQL user id as string)
        uploaderId: { type: String, required: true, index: true },
        // legacy alias used by older code paths
        createdBy: { type: String, required: true, index: true },

        caption: { type: String, default: "" },
        locationText: { type: String, default: "" },
        tags: { type: [String], default: [], index: true },
        language: { type: String, default: "en", index: true },
        region: { type: String, default: "default", index: true },

        videoUrl: { type: String, required: true },
        thumbnailUrl: { type: String, default: "" },
        durationSec: { type: Number, default: 0 },

        status: {
            type: String,
            enum: [
                // New canonical
                "ACTIVE",
                "PENDING_REVIEW",
                "HIDDEN_PENDING_REVIEW",
                "DELETED",
                // Legacy
                "pending",
                "approved",
                "rejected",
                "hidden",
                "pending_review",
                "hidden_pending_review",
            ],
            default: "PENDING_REVIEW",
            index: true,
        },
        moderationNote: { type: String, default: "" },

        likeCount: { type: Number, default: 0, index: true },
        commentCount: { type: Number, default: 0, index: true },
        reportCount: { type: Number, default: 0, index: true },

        // Recommendation stats (updated by aggregation)
        stats: {
            views: { type: Number, default: 0 },
            likes: { type: Number, default: 0 },
            comments: { type: Number, default: 0 },
            shares: { type: Number, default: 0 },
            reports: { type: Number, default: 0 },
            avgWatchTime: { type: Number, default: 0 },
            completionRate: { type: Number, default: 0 },
            viewsLast1h: { type: Number, default: 0 },
            viewsLast24h: { type: Number, default: 0 },
        },

        risk: {
            reportRate: { type: Number, default: 0 },
            matchedFlags: { type: [String], default: [] },
            isSensitive: { type: Boolean, default: false },
        },
        matchedFlags: { type: [String], default: [] }, // legacy
    },
    { timestamps: true },
);

VideoSchema.index({ status: 1, createdAt: -1 });
VideoSchema.index({ uploaderId: 1, createdAt: -1 });
VideoSchema.index({ likeCount: -1, createdAt: -1 });
VideoSchema.index({ "stats.viewsLast24h": -1, createdAt: -1 });
VideoSchema.index({ tags: 1, status: 1, createdAt: -1 });
VideoSchema.index({ region: 1, language: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Video", VideoSchema);
