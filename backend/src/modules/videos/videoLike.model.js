const mongoose = require("mongoose");

const VideoLikeSchema = new mongoose.Schema(
    {
        videoId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true, ref: "Video" },
        userId: { type: String, required: true, index: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } },
);

// Prevent double-like per user
VideoLikeSchema.index({ videoId: 1, userId: 1 }, { unique: true });
VideoLikeSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("VideoLike", VideoLikeSchema);

