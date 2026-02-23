// src/modules/activity/activity.model.js
const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, index: true },
        action: { type: String, required: true, index: true },
        targetType: { type: String, default: "" },
        targetId: { type: String, default: "" },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    { timestamps: true },
);

ActivitySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Activity", ActivitySchema);
