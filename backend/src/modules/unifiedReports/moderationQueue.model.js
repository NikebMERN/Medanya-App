// src/modules/unifiedReports/moderationQueue.model.js
const mongoose = require("mongoose");

const ModerationQueueSchema = new mongoose.Schema(
    {
        targetType: { type: String, required: true, index: true },
        targetId: { type: String, required: true, index: true },
        priority: { type: String, enum: ["URGENT", "HIGH", "NORMAL"], default: "NORMAL", index: true },
        reasonSummary: { type: String, default: "" },
        reportCount24h: { type: Number, default: 0 },
        status: { type: String, enum: ["PENDING", "ACTIONED"], default: "PENDING", index: true },
    },
    { timestamps: true },
);

ModerationQueueSchema.index({ status: 1, priority: -1, createdAt: 1 });
ModerationQueueSchema.index({ targetType: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model("ModerationQueue", ModerationQueueSchema);
