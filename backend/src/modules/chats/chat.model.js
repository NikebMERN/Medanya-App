const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["private", "group", "public"],
        default: "private",
    },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastMessage: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Chat", chatSchema);
