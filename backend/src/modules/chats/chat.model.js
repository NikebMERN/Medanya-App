import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["private", "group", "public"],
            required: true,
        },

        members: [
            {
                type: String, // MySQL user ID
                index: true,
            },
        ],

        name: {
            type: String, // group / public chat name
            trim: true,
        },

        admins: [
            {
                type: String, // admin/moderator user IDs
            },
        ],

        lastMessage: {
            type: String,
        },

        lastMessageAt: {
            type: Date,
        },

        isArchived: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Chat", chatSchema);
