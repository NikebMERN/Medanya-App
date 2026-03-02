/**
 * Analytics service — event logging, daily increments, aggregation queries.
 * Level 2: consent gate, OTP gate, trust score gate, watch-time, dedupe, creator attribution.
 */
const AnalyticsEvent = require("./analytics_events.model");
const AnalyticsDaily = require("./analytics_daily.model");
const { EVENT_TYPES } = require("./analytics_events.model");
const { sanitizeMeta, validateEntityId } = require("./analytics.meta");
const userMysql = require("../users/user.mysql");
const trustScoreService = require("../../services/trustScore.service");
const redisConfig = require("../../config/redis");
const logger = require("../../utils/logger.util");

const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX = 100;
const DEDUPE_TTL_SEC = 600; // 10 min
const userEventCounts = new Map();

const VIEW_EVENT_TYPES = ["video_view", "livestream_join"];
const TRUST_GATED_TYPES = ["video_view", "livestream_join", "market_view"];

function getTodayStr() {
    return new Date().toISOString().slice(0, 10);
}

function getDateRange(range) {
    const days = parseInt(range, 10) || 28;
    const clamped = Math.min(90, Math.max(7, days));
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - clamped + 1); // exactly N days (inclusive)
    return { from, to, days: clamped };
}

function checkRateLimit(userId) {
    const key = String(userId);
    const now = Date.now();
    let bucket = userEventCounts.get(key);
    if (!bucket || now - bucket.start > RATE_LIMIT_WINDOW_MS) {
        bucket = { start: now, count: 0 };
        userEventCounts.set(key, bucket);
    }
    bucket.count++;
    return bucket.count <= RATE_LIMIT_MAX;
}

function viewDedupeKey(userId, entityType, entityId) {
    return `analytics:dedupe:view:${userId}:${entityType}:${entityId}`;
}

/**
 * Map event type to daily metric updates. Returns { targetUserId, updates }.
 * targetUserId: whose analytics_daily to update (creator or actor).
 */
function getMetricUpdates(type, meta = {}, actorUserId) {
    const updates = {};
    let targetUserId = actorUserId; // default: actor's own record

    switch (type) {
        case "video_view":
            updates.videoViews = 1;
            if (meta.engaged) updates.engagedViews = 1;
            if (meta.creatorId) targetUserId = meta.creatorId;
            break;
        case "video_like":
            updates.videoLikes = 1;
            if (meta.creatorId) targetUserId = meta.creatorId;
            break;
        case "video_comment":
            updates.videoComments = 1;
            if (meta.creatorId) targetUserId = meta.creatorId;
            break;
        case "video_upload":
            updates.videoUploads = 1;
            break;
        case "follow":
            updates.follows = 1;
            // follow: target is the followed user (entityId)
            if (meta.targetUserId) targetUserId = meta.targetUserId;
            break;
        case "livestream_start":
            updates.livestreamMinutes = (meta.watchTime || meta.durationMinutes || 0);
            break;
        case "livestream_join":
            updates.livestreamMinutes = (meta.watchTime || 0) / 60;
            if (meta.creatorId) targetUserId = meta.creatorId;
            break;
        case "livestream_gift":
        case "boost_live":
            updates.giftsCoins = meta.amountCoins || 0;
            if (meta.creatorId) targetUserId = meta.creatorId;
            break;
        case "boost_video":
            updates.boosts = 1;
            updates.giftsCoins = meta.amountCoins || 0;
            if (meta.creatorId) targetUserId = meta.creatorId;
            break;
        case "market_purchase":
            updates.marketSalesCount = 1;
            updates.marketSalesUSD = meta.amountUSD || 0;
            if (meta.sellerId) targetUserId = meta.sellerId;
            break;
        case "job_post":
            updates.jobPosts = 1;
            break;
        case "report_create":
            updates.reportsCount = 1;
            break;
        default:
            break;
    }
    return { targetUserId, updates };
}

/**
 * Track event with Level 2 gates.
 * @returns {{ ok: boolean, ignored?: boolean, reason?: string, event?: object } | null}
 */
async function trackEvent(userId, payload, options = {}) {
    const { ip } = options;
    const { type, entityType, entityId, meta: rawMeta } = payload || {};

    if (!userId) return null;
    const t = String(type || "").trim();
    if (!EVENT_TYPES.includes(t)) return null;

    if (!checkRateLimit(userId)) {
        logger.warn("[analytics] Rate limit exceeded", { userId, type });
        return null;
    }

    const entityIdSafe = validateEntityId(entityId);
    const meta = sanitizeMeta(typeof rawMeta === "object" ? rawMeta : {}, ip);

    // A) Consent gate
    let user;
    try {
        user = await userMysql.getById(userId);
    } catch (e) {
        logger.warn("[analytics] User lookup failed", { userId, type });
        return null;
    }
    const analyticsConsent = user?.analytics_consent;
    if (analyticsConsent !== undefined && analyticsConsent !== null && (analyticsConsent === 0 || analyticsConsent === false)) {
        logger.info("[analytics] Event ignored: NO_CONSENT", { type, entityType, entityId: entityIdSafe, userId });
        return { ok: true, ignored: true, reason: "NO_CONSENT" };
    }

    // B) OTP gate for view-count events
    if (VIEW_EVENT_TYPES.includes(t)) {
        const otpVerified = user?.otp_verified;
        if (otpVerified === 0 || otpVerified === false) {
            logger.info("[analytics] Event ignored: OTP_REQUIRED_FOR_VIEW_COUNT", { type, entityType, entityId: entityIdSafe, userId });
            return { ok: true, ignored: true, reason: "OTP_REQUIRED_FOR_VIEW_COUNT" };
        }
    }

    // C) Trust score gate for view-type events
    if (TRUST_GATED_TYPES.includes(t)) {
        let trustScore = 50;
        try {
            trustScore = await trustScoreService.getTrustScore(userId);
        } catch (_) {}
        if (trustScoreService.isHighRiskViewer(trustScore)) {
            logger.info("[analytics] Event ignored: HIGH_RISK_VIEWER", { type, entityType, entityId: entityIdSafe, userId });
            return { ok: true, ignored: true, reason: "HIGH_RISK_VIEWER" };
        }
        if (trustScore >= 35 && trustScore <= 50) {
            const dateStr = getTodayStr();
            const shouldCount = trustScoreService.shouldCountSampledView(userId, entityIdSafe, dateStr);
            if (!shouldCount) {
                logger.info("[analytics] Event ignored: SAMPLED_OUT", { type, entityType, entityId: entityIdSafe, userId });
                return { ok: true, ignored: true, reason: "SAMPLED_OUT" };
            }
        }
    }

    // D) Watch-time rule for video_view
    if (t === "video_view") {
        const watchSec = meta.watchTimeSec ?? meta.watchTime ?? 0;
        if (watchSec < 3) {
            logger.info("[analytics] Event ignored: WATCH_TIME_TOO_LOW", { type, entityType, entityId: entityIdSafe, userId });
            return { ok: true, ignored: true, reason: "WATCH_TIME_TOO_LOW" };
        }
        if (watchSec >= 10) meta.engaged = true;
    }

    // E) Dedupe for video_view
    if (t === "video_view") {
        const dedupeKey = viewDedupeKey(userId, entityType || "video", entityIdSafe);
        const existing = await redisConfig.get(dedupeKey);
        if (existing !== null) {
            logger.info("[analytics] Event ignored: DEDUPE", { type, entityType, entityId: entityIdSafe, userId });
            return { ok: true, ignored: true, reason: "DEDUPE" };
        }
        await redisConfig.set(dedupeKey, 1, DEDUPE_TTL_SEC);
    }

    // Mongo fallback for dedupe when Redis unavailable
    if (t === "video_view") {
        const tenMinAgo = new Date(Date.now() - DEDUPE_TTL_SEC * 1000);
        const recent = await AnalyticsEvent.findOne({
            userId: String(userId),
            type: "video_view",
            entityType: entityType || "video",
            entityId: entityIdSafe,
            createdAt: { $gte: tenMinAgo },
        }).lean();
        if (recent) {
            logger.info("[analytics] Event ignored: DEDUPE_MONGO", { type, entityType, entityId: entityIdSafe, userId });
            return { ok: true, ignored: true, reason: "DEDUPE" };
        }
    }

    try {
        const event = await AnalyticsEvent.create({
            userId: String(userId),
            type: t,
            entityType: String(entityType || "").slice(0, 50),
            entityId: entityIdSafe,
            meta,
        });

        const { targetUserId, updates } = getMetricUpdates(t, meta, userId);
        if (targetUserId && Object.keys(updates).length > 0) {
            const date = getTodayStr();
            await AnalyticsDaily.findOneAndUpdate(
                { userId: String(targetUserId), date },
                { $inc: updates },
                { upsert: true, new: true }
            );
        }

        logger.info("[analytics] Event tracked", { type, entityType, entityId: entityIdSafe, userId });
        return { ok: true, event: event.toObject() };
    } catch (err) {
        logger.error("[analytics] trackEvent error", { err: err?.message, type, userId });
        return null;
    }
}

/**
 * Get user analytics for range.
 */
async function getUserAnalytics(userId, range = "28") {
    const { from, to, days } = getDateRange(range);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);

    const docs = await AnalyticsDaily.find({
        userId: String(userId),
        date: { $gte: fromStr, $lte: toStr },
    })
        .sort({ date: 1 })
        .lean();

    const dateMap = new Map();
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const k = d.toISOString().slice(0, 10);
        dateMap.set(k, {
            date: k,
            views: 0,
            likes: 0,
            comments: 0,
            follows: 0,
            sales: 0,
            gifts: 0,
            uploads: 0,
            engagedViews: 0,
        });
    }
    for (const d of docs) {
        const row = dateMap.get(d.date);
        if (row && d.metrics) {
            row.views = (d.metrics.videoViews || 0) + (d.metrics.boosts || 0);
            row.likes = d.metrics.videoLikes || 0;
            row.comments = d.metrics.videoComments || 0;
            row.follows = d.metrics.follows || 0;
            row.sales = d.metrics.marketSalesUSD || 0;
            row.gifts = d.metrics.giftsCoins || 0;
            row.uploads = d.metrics.videoUploads || 0;
            row.engagedViews = d.metrics.engagedViews || 0;
        }
    }
    const series = Array.from(dateMap.values());

    const totalViews = series.reduce((s, r) => s + r.views, 0);
    const totalLikes = series.reduce((s, r) => s + r.likes, 0);
    const totalComments = series.reduce((s, r) => s + r.comments, 0);
    const totalFollows = series.reduce((s, r) => s + r.follows, 0);
    const totalMarketSalesUSD = series.reduce((s, r) => s + r.sales, 0);
    const totalGiftsCoins = series.reduce((s, r) => s + r.gifts, 0);

    const prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - days);
    const prevTo = new Date(from);
    prevTo.setDate(prevTo.getDate() - 1);
    const prevFromStr = prevFrom.toISOString().slice(0, 10);
    const prevToStr = prevTo.toISOString().slice(0, 10);
    const prevDocs = await AnalyticsDaily.find({
        userId: String(userId),
        date: { $gte: prevFromStr, $lte: prevToStr },
    }).lean();
    let prevViews = 0;
    for (const d of prevDocs) {
        prevViews += (d.metrics?.videoViews || 0) + (d.metrics?.boosts || 0);
    }
    const percentChangeViews = prevViews === 0 ? (totalViews > 0 ? 100 : 0) : Math.round(((totalViews - prevViews) / prevViews) * 100);

    return {
        range: days,
        from: fromStr,
        to: toStr,
        summary: {
            totalViews,
            totalLikes,
            totalComments,
            totalFollows,
            totalMarketSalesUSD,
            totalGiftsCoins,
            percentChangeViews,
        },
        series,
    };
}

/**
 * Admin overview — app-wide totals.
 */
async function getAdminOverview(range = "28") {
    const { from, to, days } = getDateRange(range);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);

    const agg = await AnalyticsDaily.aggregate([
        { $match: { date: { $gte: fromStr, $lte: toStr } } },
        {
            $group: {
                _id: "$date",
                totalViews: { $sum: "$metrics.videoViews" },
                totalBoosts: { $sum: "$metrics.boosts" },
                totalEngagedViews: { $sum: "$metrics.engagedViews" },
                totalLikes: { $sum: "$metrics.videoLikes" },
                totalComments: { $sum: "$metrics.videoComments" },
                totalFollows: { $sum: "$metrics.follows" },
                totalSalesUSD: { $sum: "$metrics.marketSalesUSD" },
                totalGifts: { $sum: "$metrics.giftsCoins" },
                totalUploads: { $sum: "$metrics.videoUploads" },
                totalJobPosts: { $sum: "$metrics.jobPosts" },
                totalReports: { $sum: "$metrics.reportsCount" },
                uniqueUsers: { $addToSet: "$userId" },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    const dateMap = new Map();
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const k = d.toISOString().slice(0, 10);
        dateMap.set(k, {
            date: k,
            views: 0,
            activeUsers: 0,
            uploads: 0,
            streams: 0,
            purchases: 0,
            reports: 0,
        });
    }
    for (const a of agg) {
        const row = dateMap.get(a._id);
        if (row) {
            row.views = (a.totalViews || 0) + (a.totalBoosts || 0);
            row.activeUsers = (a.uniqueUsers || []).length;
            row.uploads = a.totalUploads || 0;
            row.streams = 0;
            row.purchases = a.totalSalesUSD || 0;
            row.reports = a.totalReports || 0;
        }
    }
    const series = Array.from(dateMap.values());

    const totals = series.reduce(
        (acc, r) => ({
            totalViews: acc.totalViews + r.views,
            activeUserSet: new Set([...acc.activeUserSet, ...(r.activeUsers ? [r.date] : [])]),
            totalUploads: acc.totalUploads + r.uploads,
            totalPurchases: acc.totalPurchases + r.purchases,
            totalReports: acc.totalReports + r.reports,
        }),
        { totalViews: 0, activeUserSet: new Set(), totalUploads: 0, totalPurchases: 0, totalReports: 0 }
    );
    const uniqueUserIds = new Set();
    for (const a of agg) (a.uniqueUsers || []).forEach((u) => uniqueUserIds.add(u));
    totals.activeUsers = uniqueUserIds.size;
    delete totals.activeUserSet;

    return {
        range: days,
        from: fromStr,
        to: toStr,
        totals: {
            totalViews: totals.totalViews,
            activeUsers: totals.activeUsers,
            uploads: totals.totalUploads,
            marketplaceSales: totals.totalPurchases,
            reportsCount: totals.totalReports,
        },
        series,
    };
}

/**
 * Admin user activity breakdown by module.
 */
async function getAdminUserActivity(userId, range = "28") {
    const { from, to, days } = getDateRange(range);
    const fromDate = new Date(from);
    const toDate = new Date(to);

    const events = await AnalyticsEvent.find({
        userId: String(userId),
        createdAt: { $gte: fromDate, $lte: toDate },
    })
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();

    const byModule = {
        video: { count: 0, events: [] },
        marketplace: { count: 0, events: [] },
        jobs: { count: 0, events: [] },
        livestream: { count: 0, events: [] },
        reports: { count: 0, events: [] },
        other: { count: 0, events: [] },
    };
    const videoTypes = ["video_view", "video_like", "video_comment", "video_upload", "boost_video"];
    const marketTypes = ["market_view", "market_purchase", "market_listing_create"];
    const jobTypes = ["job_view", "job_apply", "job_post"];
    const streamTypes = ["livestream_start", "livestream_join", "livestream_gift", "boost_live"];
    const reportTypes = ["report_create", "report_resolved"];

    for (const e of events) {
        let mod = "other";
        if (videoTypes.includes(e.type)) mod = "video";
        else if (marketTypes.includes(e.type)) mod = "marketplace";
        else if (jobTypes.includes(e.type)) mod = "jobs";
        else if (streamTypes.includes(e.type)) mod = "livestream";
        else if (reportTypes.includes(e.type)) mod = "reports";
        byModule[mod].count++;
        if (byModule[mod].events.length < 10) byModule[mod].events.push(e);
    }

    const daily = await getUserAnalytics(userId, String(days));
    return {
        range: days,
        from: daily.from,
        to: daily.to,
        byModule,
        summary: daily.summary,
        series: daily.series,
    };
}

/**
 * Seed analytics_daily for dev/testing (used by dev endpoint).
 */
async function seedAnalytics({ days = 30, users = 50, creators = 10 }) {
    const today = new Date();
    const dates = [];
    for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
    }

    function spikePattern(dayIndex, totalDays) {
        const x = dayIndex / totalDays;
        const base = 50 + Math.sin(x * Math.PI * 2) * 30;
        const weekend = dayIndex % 7 >= 5 ? 1.3 : 1;
        const trend = 1 + (1 - x) * 0.5;
        return Math.max(10, Math.round(base * weekend * trend));
    }

    let inserted = 0;
    for (let u = 0; u < users; u++) {
        const userId = `seed-user-${u + 1}`;
        const isCreator = u < creators;
        for (let i = 0; i < dates.length; i++) {
            const date = dates[i];
            const baseViews = isCreator ? spikePattern(i, dates.length) * (2 + Math.floor(u / 3)) : Math.floor(Math.random() * 20);
            const likes = Math.floor(baseViews * (0.02 + Math.random() * 0.05));
            const comments = Math.floor(baseViews * (0.005 + Math.random() * 0.02));
            const engagedViews = Math.floor(baseViews * (0.1 + Math.random() * 0.2));
            await AnalyticsDaily.findOneAndUpdate(
                { userId, date },
                {
                    $set: {
                        metrics: {
                            videoViews: baseViews,
                            engagedViews: Math.min(engagedViews, baseViews),
                            videoLikes: likes,
                            videoComments: comments,
                            follows: Math.floor(Math.random() * 5),
                            livestreamMinutes: Math.floor(Math.random() * 120),
                            giftsCoins: Math.floor(Math.random() * 500),
                            marketSalesCount: Math.random() > 0.85 ? 1 : 0,
                            marketSalesUSD: Math.random() > 0.9 ? Math.floor(Math.random() * 100) : 0,
                            jobPosts: Math.random() > 0.95 ? 1 : 0,
                            reportsCount: 0,
                            videoUploads: isCreator && Math.random() > 0.7 ? 1 : 0,
                            boosts: Math.floor(Math.random() * 3),
                        },
                    },
                },
                { upsert: true }
            );
            inserted++;
        }
    }
    return { days, users, creators, inserted };
}

module.exports = {
    trackEvent,
    getUserAnalytics,
    getAdminOverview,
    getAdminUserActivity,
    seedAnalytics,
    getDateRange,
};
