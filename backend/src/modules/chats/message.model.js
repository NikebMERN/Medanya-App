// src/modules/chats/message.model.js
const mongoose = require("mongoose");

const ReadBySchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        readAt: { type: Date, required: true },
    },
    { _id: false },
);

const MessageSchema = new mongoose.Schema(
    {
        chatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chat",
            required: true,
            index: true,
        },

        senderId: { type: String, required: true, index: true },

        type: {
            type: String,
            enum: ["text", "image", "video", "voice"],
            required: true,
        },

        text: { type: String, default: "" },
        mediaUrl: { type: String, default: "" }, // placeholder only (no upload in Step-6)

        deliveredAt: { type: Date },

        // Keep spec field
        readBy: { type: [ReadBySchema], default: [] },

        // Internal helper to enforce unique read receipts per user
        readByUserIds: { type: [String], default: [] },
    },
    { timestamps: true },
);

// Pagination index
MessageSchema.index({ chatId: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model("Message", MessageSchema);
