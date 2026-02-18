// src/modules/recommendations/userInterestProfile.model.js
// Aggregated per-user profile for ranking (tag weights, recent videos for diversity)
const mongoose = require("mongoose");

const UserInterestProfileSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, unique: true, index: true },
        tagWeights: {
            type: Map,
            of: Number,
            default: () => new Map(),
        },
        recentVideoIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }],
        updatedAt: { type: Date, default: Date.now, index: true },
    },
    { timestamps: false },
);

UserInterestProfileSchema.index({ updatedAt: -1 });

module.exports = mongoose.model("UserInterestProfile", UserInterestProfileSchema);
