// src/modules/chats/chat.model.js
const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema(
    {
        type: { type: String, enum: ["direct", "group"], required: true },

        // Store MySQL user ids as strings for safety (BIGINT can exceed JS safe int)
        participants: { type: [String], required: true, index: true },

        // Direct chat uniqueness key: "minId:maxId"
        directKey: { type: String, index: true },

        createdBy: { type: String },

        // Group-only fields
        groupName: { type: String, trim: true },
        admins: { type: [String], default: [] },
        moderators: { type: [String], default: [] },

        // Metadata
        lastMessageAt: { type: Date },
        lastMessagePreview: { type: String, default: "" },
    },
    { timestamps: true },
);

// Index: participants for listing chats quickly
ChatSchema.index({ participants: 1, lastMessageAt: -1 });

// Unique direct chat between same 2 users
ChatSchema.index(
    { type: 1, directKey: 1 },
    { unique: true, partialFilterExpression: { type: "direct" } },
);

module.exports = mongoose.model("Chat", ChatSchema);
