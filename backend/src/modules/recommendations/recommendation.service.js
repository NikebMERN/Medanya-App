// src/modules/recommendations/recommendation.service.js
// 2-stage recommender: candidate generation (fast) + ranking (lightweight)
const mongoose = require("mongoose");
const Video = require("../videos/video.model");
const UserVideoEvent = require("./userVideoEvent.model");
const UserInterestProfile = require("./userInterestProfile.model");
const TrendingCache = require("./trendingCache.model");
const followDb = require("../users/follow.mysql");
const cache = require("../../config/redis");

const CANDIDATE_POOL = 200;
const EXPLORATION_RATIO = 0.15;
const ACTIVE_STATUSES = ["ACTIVE", "approved"];

function toObjectId(id) {
    if (!id) return null;
    if (typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id)) return new mongoose.Types.ObjectId(id);
    return id;
}

function normalizeStatus(s) {
    if (["approved", "active"].includes(String(s))) return "ACTIVE";
    return s;
}

/** Get blocked user ids for viewer (MySQL). */
async function getBlockedUserIds(userId) {
    if (!userId) return new Set();
    try {
        const ids = await followDb.getBlockedUserIds(userId);
        return new Set(ids.map(String));
    } catch {
        return new Set();
    }
}

// ---------- Stage 1: Candidate generation ----------
async function getCandidates({ userId, region, language, limit = CANDIDATE_POOL }) {
    const blockedSet = await getBlockedUserIds(userId);
    const since72h = new Date(Date.now() - 72 * 60 * 60 * 1000);

    const baseQuery = {
        status: { $in: ACTIVE_STATUSES },
        uploaderId: { $nin: Array.from(blockedSet) },
    };

    const pipelines = [];

    // 1) Fresh/trending (last 24–72h with engagement)
    pipelines.push(
        Video.find({
            ...baseQuery,
            createdAt: { $gte: since72h },
            $or: [
                { "stats.viewsLast24h": { $gt: 0 } },
                { likeCount: { $gt: 0 } },
                { "stats.views": { $gt: 0 } },
            ],
        })
            .select("_id uploaderId caption tags language region status createdAt likeCount commentCount reportCount stats risk videoUrl thumbnailUrl durationSec")
            .sort({ "stats.viewsLast24h": -1, createdAt: -1 })
            .limit(Math.ceil(limit * 0.4))
            .lean(),
    );

    // 2) Region/language match
    pipelines.push(
        Video.find({
            ...baseQuery,
            $or: [
                { region: region || "default" },
                { language: language || "en" },
                { region: { $exists: false } },
                { language: { $exists: false } },
            ],
        })
            .select("_id uploaderId caption tags language region status createdAt likeCount commentCount reportCount stats risk videoUrl thumbnailUrl durationSec")
            .sort({ createdAt: -1 })
            .limit(Math.ceil(limit * 0.3))
            .lean(),
    );

    // 3) User interest tags (if profile exists)
    if (userId) {
        const profile = await UserInterestProfile.findOne({ userId }).lean();
        const tagList = profile?.tagWeights
            ? (profile.tagWeights instanceof Map
                ? Array.from(profile.tagWeights.keys())
                : Object.keys(profile.tagWeights || {})
            ).slice(0, 10)
            : [];
        if (tagList.length > 0) {
            pipelines.push(
                Video.find({
                    ...baseQuery,
                    tags: { $in: tagList },
                })
                    .select("_id uploaderId caption tags language region status createdAt likeCount commentCount reportCount stats risk videoUrl thumbnailUrl durationSec")
                    .sort({ likeCount: -1, createdAt: -1 })
                    .limit(Math.ceil(limit * 0.3))
                    .lean(),
            );
        }
    }

    // 4) Cold start: trending + editorial
    pipelines.push(
        Video.find(baseQuery)
            .select("_id uploaderId caption tags language region status createdAt likeCount commentCount reportCount stats risk videoUrl thumbnailUrl durationSec")
            .sort({ likeCount: -1, createdAt: -1 })
            .limit(Math.ceil(limit * 0.3))
            .lean(),
    );

    const results = await Promise.all(pipelines);
    const seen = new Set();
    const candidates = [];
    for (const list of results) {
        for (const v of list) {
            const id = v._id.toString();
            if (seen.has(id)) continue;
            seen.add(id);
            candidates.push(v);
            if (candidates.length >= limit) break;
        }
        if (candidates.length >= limit) break;
    }
    return candidates;
}

// ---------- Stage 2: Ranking (heuristic) ----------
function rankCandidates(candidates, { userId, userProfile, explorationRatio = EXPLORATION_RATIO }) {
    const tagWeights = userProfile?.tagWeights
        ? userProfile.tagWeights instanceof Map
            ? Object.fromEntries(userProfile.tagWeights)
            : userProfile.tagWeights || {}
        : {};
    const recentIds = new Set(
        (userProfile?.recentVideoIds || []).map((id) => id?.toString?.() || id),
    );

    const scored = candidates.map((v) => {
        const vid = v._id.toString();
        let score = 0;

        const views = v.stats?.views ?? v.likeCount ?? 0;
        const views24 = v.stats?.viewsLast24h ?? 0;
        const likes = v.likeCount ?? 0;
        const completion = v.stats?.completionRate ?? 0.5;
        const reportRate = v.risk?.reportRate ?? (v.reportCount && views ? v.reportCount / Math.max(views, 1) : 0);

        // videoTrendScore (views/hr proxy, completion)
        const trendScore = Math.log1p(views24 * 2 + views) + completion * 0.3;
        score += trendScore * 0.3;

        // freshness
        const ageHours = (Date.now() - new Date(v.createdAt).getTime()) / (60 * 60 * 1000);
        score += Math.max(0, 1 - ageHours / 168) * 0.2;

        // userInterestTagWeight
        const tags = v.tags || [];
        let tagMatch = 0;
        for (const t of tags) {
            tagMatch += Number(tagWeights[t]) || 0;
        }
        score += Math.min(1, tagMatch) * 0.25;

        // creator boost (followed) – skip if no follow data for MVP
        // score += creatorBoost * 0.1;

        // diversity: repetition penalty
        const repetitionPenalty = recentIds.has(vid) ? 0.5 : 0;
        score -= repetitionPenalty * 0.2;

        // safety penalty
        score -= reportRate * 2;
        if (v.risk?.isSensitive) score -= 0.5;
        if ((v.matchedFlags || []).length > 0) score -= 0.2;

        // exploration: small random boost for 10–20% so new tags appear
        const exploration = Math.random() < explorationRatio ? 0.15 : 0;
        score += exploration;

        return { video: v, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((x) => x.video);
}

// ---------- Public: get recommendations ----------
async function getRecommendations({ userId, region, language, cursor, limit = 20 }) {
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const cacheKey = cache.feedCandidatesKey(userId, region, language);
    let ranked = await cache.get(cacheKey);
    if (!ranked || !Array.isArray(ranked)) {
        const candidates = await getCandidates({ userId, region, language, limit: CANDIDATE_POOL });
        let profile = null;
        if (userId) {
            profile = await UserInterestProfile.findOne({ userId }).lean();
        }
        ranked = rankCandidates(candidates, { userId, userProfile: profile });
        await cache.set(cacheKey, ranked.map((v) => v._id.toString()), 60 * 3); // 3 min
    }

    const ids = typeof ranked[0] === "string" ? ranked : ranked.map((v) => v._id.toString());
    let offset = 0;
    if (cursor) {
        try {
            const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));
            offset = Math.max(0, parseInt(decoded.offset, 10) || 0);
        } catch {}
        offset = Math.min(offset, ids.length);
    }

    const pageIds = ids.slice(offset, offset + l);
    const videos = await Video.find({ _id: { $in: pageIds.map(toObjectId).filter(Boolean) } })
        .lean()
        .then((list) => {
            const byId = {};
            list.forEach((v) => { byId[v._id.toString()] = v; });
            return pageIds.map((id) => byId[id]).filter(Boolean);
        });

    const nextOffset = offset + l;
    const nextCursor =
        nextOffset < ids.length
            ? Buffer.from(JSON.stringify({ offset: nextOffset }), "utf8").toString("base64")
            : null;

    return {
        items: videos.map((v) => ({
            videoId: v._id.toString(),
            videoUrl: v.videoUrl,
            thumbnailUrl: v.thumbnailUrl || "",
            caption: v.caption || "",
            tags: v.tags || [],
            creator: { uploaderId: v.uploaderId },
            stats: {
                views: v.stats?.views ?? 0,
                likes: v.likeCount ?? 0,
                comments: v.commentCount ?? 0,
                completionRate: v.stats?.completionRate ?? 0,
            },
        })),
        nextCursor,
    };
}

// ---------- Event ingestion ----------
async function ingestEvents(userId, events) {
    if (!userId || !Array.isArray(events) || events.length === 0) return { ok: true, count: 0 };
    const bulk = events.slice(0, 50).map((e) => ({
        userId,
        videoId: toObjectId(e.videoId),
        eventType: e.eventType || "IMPRESSION",
        watchTimeMs: e.watchTimeMs ?? null,
        createdAt: e.ts ? new Date(e.ts) : new Date(),
    }));
    const valid = bulk.filter((b) => b.videoId && b.eventType);
    if (valid.length === 0) return { ok: true, count: 0 };
    await UserVideoEvent.insertMany(valid);
    return { ok: true, count: valid.length };
}

// ---------- Trending ----------
async function getTrending({ region, language, limit = 20 }) {
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const cacheKey = cache.trendingKey(region, language);
    let cached = await cache.get(cacheKey);
    if (cached && Array.isArray(cached.items)) {
        return { items: cached.items.slice(0, l), nextCursor: null };
    }

    const doc = await TrendingCache.findOne({
        region: region || "default",
        language: language || "en",
    }).lean();

    let videoIds = (doc?.videoIds || []).slice(0, l * 2);
    if (videoIds.length === 0) {
        const videos = await Video.find({
            status: { $in: ACTIVE_STATUSES },
            $or: [
                { region: region || "default" },
                { language: language || "en" },
                { region: { $exists: false } },
            ],
        })
            .sort({ "stats.viewsLast24h": -1, likeCount: -1, createdAt: -1 })
            .limit(l)
            .lean();
        videoIds = videos.map((v) => v._id);
    }

    const videos = await Video.find({ _id: { $in: videoIds } })
        .select("_id videoUrl thumbnailUrl caption tags uploaderId likeCount commentCount stats")
        .lean();

    const items = videos.map((v) => ({
        videoId: v._id.toString(),
        videoUrl: v.videoUrl,
        thumbnailUrl: v.thumbnailUrl || "",
        caption: v.caption || "",
        tags: v.tags || [],
        creator: { uploaderId: v.uploaderId },
        stats: {
            views: v.stats?.views ?? 0,
            likes: v.likeCount ?? 0,
            comments: v.commentCount ?? 0,
        },
    }));

    await cache.set(cacheKey, { items }, 60 * 5);
    return { items: items.slice(0, l), nextCursor: null };
}

module.exports = {
    getCandidates,
    rankCandidates,
    getRecommendations,
    ingestEvents,
    getTrending,
};
