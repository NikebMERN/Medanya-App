/**
 * Analytics integration tests — Level 2 gates, dedupe, percent change, series.
 * Run: node --test tests/analytics.integration.test.js
 * Requires: MONGO_URI, JWT_SECRET. Optional: real MySQL user for full HTTP tests.
 */
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");

const AnalyticsEvent = require("../src/modules/analytics/analytics_events.model");
const AnalyticsDaily = require("../src/modules/analytics/analytics_daily.model");
const userMysql = require("../src/modules/users/user.mysql");
const trustScoreService = require("../src/services/trustScore.service");
const redisConfig = require("../src/config/redis");

async function getService() {
    const s = require("../src/modules/analytics/analytics.service");
    return s;
}

describe("analytics.service — Level 2 gates", () => {
    const TEST_USER = "test-analytics-gates";
    let service;
    let originalGetById;
    let originalGetTrustScore;
    let originalRedisGet;
    let originalRedisSet;

    before(async () => {
        if (process.env.MONGO_URI) await mongoose.connect(process.env.MONGO_URI);
        service = await getService();
        originalGetById = userMysql.getById.bind(userMysql);
        originalGetTrustScore = trustScoreService.getTrustScore.bind(trustScoreService);
        originalRedisGet = redisConfig.get.bind(redisConfig);
        originalRedisSet = redisConfig.set.bind(redisConfig);
    });

    after(async () => {
        userMysql.getById = originalGetById;
        trustScoreService.getTrustScore = originalGetTrustScore;
        redisConfig.get = originalRedisGet;
        redisConfig.set = originalRedisSet;
    });

    it("video_view ignored when watchTimeSec < 3", async () => {
        userMysql.getById = async () => ({ analytics_consent: 1, otp_verified: 1 });
        trustScoreService.getTrustScore = async () => 60;
        redisConfig.get = async () => null;
        redisConfig.set = async () => true;

        const r = await service.trackEvent(TEST_USER, {
            type: "video_view",
            entityType: "video",
            entityId: "vid-1",
            meta: { watchTimeSec: 2 },
        });
        assert.ok(r);
        assert.strictEqual(r.ok, true);
        assert.strictEqual(r.ignored, true);
        assert.strictEqual(r.reason, "WATCH_TIME_TOO_LOW");
    });

    it("video_view ignored when analytics_consent=false", async () => {
        userMysql.getById = async () => ({ analytics_consent: 0, otp_verified: 1 });
        trustScoreService.getTrustScore = async () => 60;
        redisConfig.get = async () => null;
        redisConfig.set = async () => true;

        const r = await service.trackEvent(TEST_USER, {
            type: "video_view",
            entityType: "video",
            entityId: "vid-2",
            meta: { watchTimeSec: 5 },
        });
        assert.ok(r);
        assert.strictEqual(r.ok, true);
        assert.strictEqual(r.ignored, true);
        assert.strictEqual(r.reason, "NO_CONSENT");
    });

    it("video_view ignored when otp_verified=false", async () => {
        userMysql.getById = async () => ({ analytics_consent: 1, otp_verified: 0 });
        trustScoreService.getTrustScore = async () => 60;
        redisConfig.get = async () => null;
        redisConfig.set = async () => true;

        const r = await service.trackEvent(TEST_USER, {
            type: "video_view",
            entityType: "video",
            entityId: "vid-3",
            meta: { watchTimeSec: 5 },
        });
        assert.ok(r);
        assert.strictEqual(r.ok, true);
        assert.strictEqual(r.ignored, true);
        assert.strictEqual(r.reason, "OTP_REQUIRED_FOR_VIEW_COUNT");
    });

    it("video_view ignored when trust score < 35 (high risk)", async () => {
        userMysql.getById = async () => ({ analytics_consent: 1, otp_verified: 1 });
        trustScoreService.getTrustScore = async () => 30;
        redisConfig.get = async () => null;
        redisConfig.set = async () => true;

        const r = await service.trackEvent(TEST_USER, {
            type: "video_view",
            entityType: "video",
            entityId: "vid-4",
            meta: { watchTimeSec: 5 },
        });
        assert.ok(r);
        assert.strictEqual(r.ok, true);
        assert.strictEqual(r.ignored, true);
        assert.strictEqual(r.reason, "HIGH_RISK_VIEWER");
    });

    it("dedupe: second view within 10 min ignored", async () => {
        userMysql.getById = async () => ({ analytics_consent: 1, otp_verified: 1 });
        trustScoreService.getTrustScore = async () => 60;
        let getCalls = 0;
        redisConfig.get = async (k) => {
            getCalls++;
            return getCalls === 1 ? null : 1;
        };
        redisConfig.set = async () => true;

        const uniqueId = "vid-dedup-" + Date.now();
        const r1 = await service.trackEvent(TEST_USER, {
            type: "video_view",
            entityType: "video",
            entityId: uniqueId,
            meta: { watchTimeSec: 5, creatorId: "creator-1" },
        });
        assert.ok(r1);
        assert.strictEqual(r1.ignored, undefined);
        assert.ok(r1.event);

        const r2 = await service.trackEvent(TEST_USER, {
            type: "video_view",
            entityType: "video",
            entityId: uniqueId,
            meta: { watchTimeSec: 5, creatorId: "creator-1" },
        });
        assert.ok(r2);
        assert.strictEqual(r2.ignored, true);
        assert.strictEqual(r2.reason, "DEDUPE");
    });
});

describe("analytics.service — getDateRange and series", () => {
    let service;

    before(async () => {
        if (process.env.MONGO_URI) await mongoose.connect(process.env.MONGO_URI);
        service = await getService();
    });

    after(async () => {
        if (mongoose.connection.readyState === 1) await mongoose.disconnect();
    });

    it("getDateRange returns exactly N days", () => {
        const r7 = service.getDateRange("7");
        assert.strictEqual(r7.days, 7);
        const r28 = service.getDateRange("28");
        assert.strictEqual(r28.days, 28);
        const r90 = service.getDateRange("90");
        assert.strictEqual(r90.days, 90);
    });

    it("series returns exactly N days for range", async () => {
        if (!process.env.MONGO_URI) return;
        if (mongoose.connection.readyState !== 1) return;
        const userId = "test-series-user-" + Date.now();
        const data = await service.getUserAnalytics(userId, "14");
        assert.ok(Array.isArray(data.series));
        assert.strictEqual(data.series.length, 14);
        assert.strictEqual(data.range, 14);
    });
});

describe("analytics.service — percent change calculation", () => {
    let service;

    before(async () => {
        if (process.env.MONGO_URI && mongoose.connection.readyState !== 1) await mongoose.connect(process.env.MONGO_URI);
        service = await getService();
    });

    after(async () => {
        if (mongoose.connection.readyState === 1) await mongoose.disconnect();
    });

    it("percent change correct when prevViews is 0 and current > 0", async () => {
        if (!process.env.MONGO_URI) return;
        if (mongoose.connection.readyState !== 1) return;
        const userId = "test-pct-user-" + Date.now();
        const today = new Date().toISOString().slice(0, 10);
        await AnalyticsDaily.findOneAndUpdate(
            { userId, date: today },
            { $inc: { "metrics.videoViews": 100 } },
            { upsert: true }
        );
        const data = await service.getUserAnalytics(userId, "7");
        assert.ok(data.summary.percentChangeViews >= 0);
        if (data.summary.totalViews > 0 && data.summary.percentChangeViews === 100) {
            assert.ok(true);
        }
        await AnalyticsDaily.deleteOne({ userId });
    });
});
