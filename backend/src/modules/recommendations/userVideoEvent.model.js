// src/modules/recommendations/userVideoEvent.model.js
// Append-only events for learning and aggregation
const mongoose = require("mongoose");

const UserVideoEventSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, index: true },
        videoId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
        eventType: {
            type: String,
            required: true,
            enum: [
                "IMPRESSION",
                "VIEW_START",
                "WATCH_TIME",
                "COMPLETE",
                "LIKE",
                "COMMENT",
                "SHARE",
                "SKIP",
                "REPORT",
            ],
            index: true,
        },
        watchTimeMs: { type: Number, default: null },
        createdAt: { type: Date, default: Date.now, index: true },
    },
    { timestamps: false },
);

UserVideoEventSchema.index({ userId: 1, createdAt: -1 });
UserVideoEventSchema.index({ videoId: 1, eventType: 1, createdAt: -1 });
UserVideoEventSchema.index({ userId: 1, videoId: 1, eventType: 1 });

module.exports = mongoose.model("UserVideoEvent", UserVideoEventSchema);
