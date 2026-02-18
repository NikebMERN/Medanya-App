// src/modules/recommendations/recommendation.controller.js
const recommendationService = require("./recommendation.service");
const aggregationJob = require("./aggregation.job");
const cache = require("../../config/redis");

function sendErr(res, code, message) {
    const status = code === "UNAUTHORIZED" ? 401 : code === "VALIDATION_ERROR" ? 400 : 500;
    return res.status(status).json({ error: { code, message: message || code } });
}

async function getRecommendations(req, res) {
    try {
        const userId = req.user?.id ?? req.user?.userId ?? null;
        const region = req.query.region || "default";
        const language = req.query.language || req.query.lang || "en";
        const cursor = req.query.cursor;
        const limit = req.query.limit;

        const data = await recommendationService.getRecommendations({
            userId,
            region,
            language,
            cursor,
            limit,
        });
        return res.json({ success: true, ...data });
    } catch (e) {
        return sendErr(res, "SERVER_ERROR", e?.message);
    }
}

async function postEvents(req, res) {
    try {
        const userId = req.user?.id ?? req.user?.userId;
        if (!userId) return sendErr(res, "UNAUTHORIZED", "Auth required");
        const body = req.body;
        const events = Array.isArray(body) ? body : body?.events ? body.events : [];
        if (events.length === 0) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "events array required" } });

        const rateKey = cache.eventRateLimitKey(userId);
        const window = 60;
        const maxPerMin = 30;
        // Optional: check rate limit from Redis and reject if over

        const result = await recommendationService.ingestEvents(userId, events);
        aggregationJob.runUserAggregation(userId).catch(() => {});
        return res.status(202).json({ success: true, ...result });
    } catch (e) {
        return sendErr(res, "SERVER_ERROR", e?.message);
    }
}

async function getTrending(req, res) {
    try {
        const region = req.query.region || "default";
        const language = req.query.language || req.query.lang || "en";
        const limit = req.query.limit;
        const data = await recommendationService.getTrending({ region, language, limit });
        return res.json({ success: true, ...data });
    } catch (e) {
        return sendErr(res, "SERVER_ERROR", e?.message);
    }
}

module.exports = {
    getRecommendations,
    postEvents,
    getTrending,
};
