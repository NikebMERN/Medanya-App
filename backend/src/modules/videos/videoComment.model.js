const mongoose = require("mongoose");

const VideoCommentSchema = new mongoose.Schema(
    {
        videoId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true, ref: "Video" },
        userId: { type: String, required: true, index: true },
        text: { type: String, required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } },
);

VideoCommentSchema.index({ videoId: 1, createdAt: -1 });
VideoCommentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("VideoComment", VideoCommentSchema);

