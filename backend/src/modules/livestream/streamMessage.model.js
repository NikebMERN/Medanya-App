// src/modules/livestream/streamMessage.model.js
const mongoose = require("mongoose");

const StreamMessageSchema = new mongoose.Schema(
    {
        streamId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Stream",
            required: true,
            index: true,
        },
        senderId: { type: String, required: true, index: true },
        type: { type: String, enum: ["text"], default: "text" },
        text: { type: String, required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } },
);

StreamMessageSchema.index({ streamId: 1, createdAt: -1 });

module.exports = mongoose.model("StreamMessage", StreamMessageSchema);
