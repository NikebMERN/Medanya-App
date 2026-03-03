/**
 * analytics_events — Raw analytics events (MongoDB).
 * Each event: type, entityType, entityId, userId, meta, createdAt.
 */
const mongoose = require("mongoose");

const EVENT_TYPES = [
    "video_view", "video_like", "video_comment", "video_upload",
    "record_start", "record_stop", "upload_success", "upload_fail",
    "follow", "unfollow",
    "market_view", "market_purchase", "market_listing_create",
    "job_view", "job_apply", "job_post",
    "livestream_start", "livestream_join", "livestream_gift", "livestream_end",
    "boost_video", "boost_live",
    "superlike_sent", "ad_reward_earned",
    "report_create", "report_resolved",
];

const ENTITY_TYPES = ["video", "market_item", "job", "stream", "profile", "user", "report"];

const AnalyticsEventSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, index: true },
        type: { type: String, enum: EVENT_TYPES, required: true, index: true },
        entityType: { type: String, enum: ENTITY_TYPES, default: "", index: true },
        entityId: { type: String, default: "", index: true },
        meta: {
            watchTime: Number,
            watchTimeSec: Number,
            amountCoins: Number,
            amountUSD: Number,
            ipHash: String,
            deviceIdHash: String,
            country: String,
            creatorId: String,
            engaged: Boolean,
            extra: mongoose.Schema.Types.Mixed,
        },
    },
    { timestamps: true },
);

AnalyticsEventSchema.index({ userId: 1, createdAt: -1 });
AnalyticsEventSchema.index({ type: 1, createdAt: -1 });
AnalyticsEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AnalyticsEvent", AnalyticsEventSchema);
module.exports.EVENT_TYPES = EVENT_TYPES;
module.exports.ENTITY_TYPES = ENTITY_TYPES;
