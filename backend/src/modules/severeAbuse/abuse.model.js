const mongoose = require("mongoose");

const severeAbuseSchema = new mongoose.Schema({
    isAnonymous: { type: Boolean, default: true },

    reporterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
    },

    abuseType: {
        type: String,
        enum: [
            "physical_abuse",
            "sexual_harassment",
            "forced_labor",
            "passport_confiscation",
            "threats",
            "other",
        ],
        required: true,
    },

    description: {
        type: String,
        required: true,
    },

    evidence: {
        photos: [String],
        videos: [String],
        audios: [String],
    },

    location: {
        lat: Number,
        lng: Number,
        description: String,
    },

    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },

    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // admin/moderator
    },

    createdAt: { type: Date, default: Date.now },
    reviewedAt: Date,
});

module.exports = mongoose.model("SevereAbuse", severeAbuseSchema);
