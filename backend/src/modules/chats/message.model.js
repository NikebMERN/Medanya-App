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
            enum: ["text", "image", "video", "voice", "file", "location", "poll", "contact", "profile"],
            required: true,
        },

        text: { type: String, default: "" },
        mediaUrl: { type: String, default: "" }, // placeholder only (no upload in Step-6)

        deliveredAt: { type: Date },

        // Per-recipient delivery tracking (optional; deliveredAt = sent timestamp)
        deliveredTo: { type: [String], default: [] },

        // Keep spec field
        readBy: { type: [ReadBySchema], default: [] },

        // Internal helper to enforce unique read receipts per user
        readByUserIds: { type: [String], default: [] },

        // "Delete for me": hide this message for these user ids
        deletedForUserIds: { type: [String], default: [] },

        // Poll votes: [{ userId: String, optionIndex: Number }], one vote per user (last wins if changed)
        pollVotes: {
            type: [
                {
                    userId: { type: String, required: true },
                    optionIndex: { type: Number, required: true },
                },
            ],
            default: [],
        },
    },
    { timestamps: true },
);

// Pagination index
MessageSchema.index({ chatId: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model("Message", MessageSchema);
