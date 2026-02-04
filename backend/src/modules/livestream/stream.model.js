const mongoose = require("mongoose");

const streamSchema = new mongoose.Schema({
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    channelName: String,
    isLive: { type: Boolean, default: false },
    gifts: [
        {
            senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            giftType: String,
            value: Number,
            createdAt: { type: Date, default: Date.now },
        },
    ],
    viewersCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Livestream", streamSchema);
