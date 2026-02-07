// src/modules/livestream/stream.model.js
const mongoose = require("mongoose");

const StreamSchema = new mongoose.Schema(
    {
        hostId: { type: String, required: true, index: true },
        title: { type: String, default: "" },
        category: { type: String, default: "" },

        status: {
            type: String,
            enum: ["live", "ended", "banned"],
            default: "live",
            index: true,
        },

        provider: { type: String, enum: ["agora", "livekit"], default: "agora" },
        providerRoom: { type: String, required: true },

        startedAt: { type: Date, default: Date.now },
        endedAt: { type: Date, default: null },

        viewerCount: { type: Number, default: 0 },
        totalGiftsValue: { type: Number, default: 0 }, // integer coins
    },
    { timestamps: true },
);

StreamSchema.index({ hostId: 1, createdAt: -1 });
StreamSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Stream", StreamSchema);
