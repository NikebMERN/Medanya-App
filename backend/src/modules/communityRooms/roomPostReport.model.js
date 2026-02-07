// src/modules/communityRooms/roomPostReport.model.js
const mongoose = require("mongoose");

const RoomPostReportSchema = new mongoose.Schema(
    {
        postId: { type: mongoose.Schema.Types.ObjectId, ref: "RoomPost", required: true, index: true },
        reporterId: { type: String, required: true, index: true },
        reason: { type: String, required: true, maxlength: 100 },
        description: { type: String, default: "", maxlength: 500 },
    },
    { timestamps: true }
);

RoomPostReportSchema.index({ postId: 1, reporterId: 1 }, { unique: true });

module.exports = mongoose.model("RoomPostReport", RoomPostReportSchema);
