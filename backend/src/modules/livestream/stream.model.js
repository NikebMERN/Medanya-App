// src/modules/livestream/stream.model.js
const mongoose = require("mongoose");

const StreamSchema = new mongoose.Schema(
    {
        hostId: { type: String, required: true, index: true },
        title: { type: String, default: "" },
        category: { type: String, default: "" },

        status: {
            type: String,
            enum: ["live", "ended", "banned", "stopped_pending_review"],
            default: "live",
            index: true,
        },

        provider: { type: String, enum: ["agora", "livekit"], default: "agora" },
        providerRoom: { type: String, required: true },
        channelName: { type: String, default: "" }, // same as providerRoom for API compatibility

        startedAt: { type: Date, default: Date.now },
        endedAt: { type: Date, default: null },

        viewerCount: { type: Number, default: 0 },
        totalGiftsValue: { type: Number, default: 0 }, // integer coins
        reportCount: { type: Number, default: 0 },
        lastReportAt: { type: Date, default: null },
    },
    { timestamps: true },
);

StreamSchema.index({ hostId: 1, createdAt: -1 });
StreamSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Stream", StreamSchema);
