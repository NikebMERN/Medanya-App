/**
 * analytics_daily — Daily aggregation per user (MongoDB).
 * Incremented in real-time; can be rebuilt by aggregation job.
 */
const mongoose = require("mongoose");

const AnalyticsDailySchema = new mongoose.Schema(
    {
        date: { type: String, required: true, index: true }, // YYYY-MM-DD
        userId: { type: String, required: true, index: true },
        metrics: {
            videoViews: { type: Number, default: 0 },
            engagedViews: { type: Number, default: 0 },
            videoLikes: { type: Number, default: 0 },
            videoComments: { type: Number, default: 0 },
            follows: { type: Number, default: 0 },
            livestreamMinutes: { type: Number, default: 0 },
            giftsCoins: { type: Number, default: 0 },
            marketSalesCount: { type: Number, default: 0 },
            marketSalesUSD: { type: Number, default: 0 },
            jobPosts: { type: Number, default: 0 },
            reportsCount: { type: Number, default: 0 },
            videoUploads: { type: Number, default: 0 },
            boosts: { type: Number, default: 0 },
        },
    },
    { timestamps: true },
);

AnalyticsDailySchema.index({ userId: 1, date: -1 }, { unique: true });
AnalyticsDailySchema.index({ date: -1 });

module.exports = mongoose.model("AnalyticsDaily", AnalyticsDailySchema);
