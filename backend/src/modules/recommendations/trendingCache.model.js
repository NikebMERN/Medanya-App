// src/modules/recommendations/trendingCache.model.js
// Precomputed trending (hourly): by region + language
const mongoose = require("mongoose");

const TrendingCacheSchema = new mongoose.Schema(
    {
        region: { type: String, default: "default", index: true },
        language: { type: String, default: "en", index: true },
        tagScores: {
            type: Map,
            of: Number,
            default: () => new Map(),
        },
        videoIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }],
        updatedAt: { type: Date, default: Date.now, index: true },
    },
    { timestamps: false },
);

TrendingCacheSchema.index({ region: 1, language: 1 }, { unique: true });

module.exports = mongoose.model("TrendingCache", TrendingCacheSchema);
