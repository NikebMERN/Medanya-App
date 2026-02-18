// src/modules/recommendations/aggregation.job.js
// Async aggregation: update user_interest_profile and video stats from user_video_events.
// Run periodically (e.g. every 5–15 min) or trigger after event batch. MVP: lightweight updates.
const UserVideoEvent = require("./userVideoEvent.model");
const UserInterestProfile = require("./userInterestProfile.model");
const Video = require("../videos/video.model");
const logger = require("../../utils/logger.util");

const RECENT_VIDEOS_CAP = 100;
const TAG_DECAY = 0.95;

async function updateUserInterestFromEvents(userId, limit = 200) {
    const events = await UserVideoEvent.find({ userId, eventType: { $in: ["VIEW_START", "COMPLETE", "LIKE", "COMMENT"] } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

    const videoIds = [...new Set(events.map((e) => e.videoId))];
    const videos = await Video.find({ _id: { $in: videoIds } }).select("tags").lean();
    const tagsByVideo = {};
    videos.forEach((v) => { tagsByVideo[v._id.toString()] = v.tags || []; });

    const tagWeights = {};
    let t = 1;
    for (const e of events) {
        const tags = tagsByVideo[e.videoId?.toString()] || [];
        for (const tag of tags) {
            tagWeights[tag] = (tagWeights[tag] || 0) + t;
        }
        t *= TAG_DECAY;
    }

    const recentVideoIds = [...new Set(events.map((e) => e.videoId).filter(Boolean))].slice(0, RECENT_VIDEOS_CAP);

    await UserInterestProfile.findOneAndUpdate(
        { userId },
        {
            $set: {
                tagWeights,
                recentVideoIds,
                updatedAt: new Date(),
            },
        },
        { upsert: true },
    );
}

async function updateVideoStatsFromEvents(videoId, limit = 500) {
    const events = await UserVideoEvent.find({ videoId }).sort({ createdAt: -1 }).limit(limit).lean();
    let views = 0;
    let watchTimeSum = 0;
    let completeCount = 0;
    for (const e of events) {
        if (e.eventType === "VIEW_START" || e.eventType === "IMPRESSION") views += 1;
        if (e.watchTimeMs) watchTimeSum += e.watchTimeMs;
        if (e.eventType === "COMPLETE") completeCount += 1;
    }
    const avgWatchTime = views > 0 ? Math.round(watchTimeSum / views) : 0;
    const completionRate = views > 0 ? completeCount / views : 0;

    await Video.updateOne(
        { _id: videoId },
        {
            $set: {
                "stats.views": views,
                "stats.avgWatchTime": avgWatchTime,
                "stats.completionRate": completionRate,
            },
        },
    );
}

/** Run aggregation for a single user (e.g. after event batch). */
async function runUserAggregation(userId) {
    try {
        await updateUserInterestFromEvents(userId);
    } catch (e) {
        logger.error("recommendation aggregation user", e);
    }
}

/** Run aggregation for recent events (e.g. cron). */
async function runPeriodicAggregation() {
    try {
        const recent = await UserVideoEvent.aggregate([
            { $sort: { createdAt: -1 } },
            { $group: { _id: "$userId", last: { $first: "$createdAt" } } },
            { $limit: 50 },
        ]);
        for (const r of recent) {
            if (r._id) await updateUserInterestFromEvents(r._id);
        }
    } catch (e) {
        logger.error("recommendation aggregation periodic", e);
    }
}

module.exports = {
    updateUserInterestFromEvents,
    updateVideoStatsFromEvents,
    runUserAggregation,
    runPeriodicAggregation,
};
