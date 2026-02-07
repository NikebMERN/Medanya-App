// src/modules/communityRooms/roomPost.model.js
const mongoose = require("mongoose");

const ROOM_CATEGORIES = ["jobs", "scammer_alerts", "missing_persons", "buy_sell"];
const POST_STATUSES = ["pending", "approved", "rejected", "hidden"];

const RoomPostSchema = new mongoose.Schema(
    {
        category: {
            type: String,
            required: true,
            enum: ROOM_CATEGORIES,
            index: true,
        },
        authorId: { type: String, required: true, index: true },
        title: { type: String, required: true, maxlength: 200 },
        body: { type: String, default: "", maxlength: 5000 },
        status: {
            type: String,
            enum: POST_STATUSES,
            default: "pending",
            index: true,
        },
        reportCount: { type: Number, default: 0 },
        moderatedAt: { type: Date, default: null },
        moderatedBy: { type: String, default: null },
    },
    { timestamps: true }
);

RoomPostSchema.index({ category: 1, status: 1, createdAt: -1 });
RoomPostSchema.index({ authorId: 1, createdAt: -1 });

module.exports = mongoose.model("RoomPost", RoomPostSchema);
module.exports.ROOM_CATEGORIES = ROOM_CATEGORIES;
module.exports.POST_STATUSES = POST_STATUSES;
