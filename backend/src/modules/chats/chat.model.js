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
        groupAvatarUrl: { type: String, default: "" },
        isChannel: { type: Boolean, default: false },
        admins: { type: [String], default: [] },
        moderators: { type: [String], default: [] },
        // Group: when true, any member can edit group name and avatar
        membersCanEditProfile: { type: Boolean, default: false },
        // Channel: when true, members can send messages
        membersCanSendMessages: { type: Boolean, default: false },
        // Channel: when true, members can edit channel name and avatar
        membersCanEditChannel: { type: Boolean, default: false },

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
