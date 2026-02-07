// src/modules/videos/video.model.js
const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema(
    {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        userId: { type: String, required: true, index: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now, index: true },
    },
    { _id: false },
);

const ReportSchema = new mongoose.Schema(
    {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        reporterId: { type: String, required: true, index: true },
        reason: {
            type: String,
            enum: [
                "spam",
                "nudity",
                "violence",
                "hate",
                "scam",
                "harassment",
                "other",
            ],
            default: "other",
        },
        note: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now, index: true },
    },
    { _id: false },
);

const VideoSchema = new mongoose.Schema(
    {
        createdBy: { type: String, required: true, index: true },

        videoUrl: { type: String, required: true },
        thumbnailUrl: { type: String, default: "" },

        caption: { type: String, default: "" },
        locationText: { type: String, default: "" },

        // Moderation
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "hidden"],
            default: "pending",
            index: true,
        },
        moderationNote: { type: String, default: "" },

        // Engagement
        likes: { type: [String], default: [] }, // userIds
        likeCount: { type: Number, default: 0, index: true },

        comments: { type: [CommentSchema], default: [] },
        commentCount: { type: Number, default: 0, index: true },

        reports: { type: [ReportSchema], default: [] },
        reportCount: { type: Number, default: 0, index: true },
    },
    { timestamps: true },
);

// Listing indexes
VideoSchema.index({ status: 1, createdAt: -1 });
VideoSchema.index({ likeCount: -1, createdAt: -1 });

module.exports = mongoose.model("Video", VideoSchema);
