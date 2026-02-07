// src/modules/communityRooms/roomPostComment.model.js
const mongoose = require("mongoose");

const RoomPostCommentSchema = new mongoose.Schema(
    {
        postId: { type: mongoose.Schema.Types.ObjectId, ref: "RoomPost", required: true, index: true },
        authorId: { type: String, required: true, index: true },
        text: { type: String, default: "", maxlength: 2000 },
        voiceUrl: { type: String, default: null, maxlength: 600 },
        status: { type: String, enum: ["visible", "hidden"], default: "visible" },
    },
    { timestamps: true }
);

RoomPostCommentSchema.index({ postId: 1, createdAt: 1 });

module.exports = mongoose.model("RoomPostComment", RoomPostCommentSchema);
