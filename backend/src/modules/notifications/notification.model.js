// src/modules/notifications/notification.model.js
const mongoose = require("mongoose");

const NotificationLogSchema = new mongoose.Schema(
    {
        userId: { type: String, index: true },
        title: { type: String, required: true },
        body: { type: String, required: true },
        data: { type: Object, default: {} },
        status: {
            type: String,
            enum: ["queued", "sent", "failed"],
            default: "queued",
        },
        error: { type: String, default: "" },
    },
    { timestamps: true },
);

NotificationLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("NotificationLog", NotificationLogSchema);
