// src/modules/chats/chatMember.model.js
const mongoose = require("mongoose");

const ChatMemberSchema = new mongoose.Schema(
    {
        chatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chat",
            required: true,
            index: true,
        },
        userId: { type: String, required: true, index: true },
        lastReadMessageId: { type: mongoose.Schema.Types.ObjectId, default: null },
        lastReadAt: { type: Date, default: null },
        unreadCount: { type: Number, default: 0 },
    },
    { timestamps: true },
);

ChatMemberSchema.index({ chatId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("ChatMember", ChatMemberSchema);
