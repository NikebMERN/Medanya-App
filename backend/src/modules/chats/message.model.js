import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        chatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chat",
            index: true,
            required: true,
        },

        senderId: {
            type: String, // MySQL user ID
            required: true,
            index: true,
        },

        type: {
            type: String,
            enum: ["text", "image", "voice", "video"],
            required: true,
        },

        content: {
            type: String, // text or media URL
        },

        thumbnail: {
            type: String, // for video preview
        },

        duration: {
            type: Number, // voice/video length (seconds)
        },

        isDeleted: {
            type: Boolean,
            default: false,
        },

        readBy: [
            {
                userId: String,
                readAt: Date,
            },
        ],
    },
    { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
