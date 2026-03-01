/**
 * Analytics controller — event tracking, user analytics, admin endpoints.
 */
const analyticsService = require("./analytics.service");

async function trackEvent(req, res) {
    try {
        const userId = req.user?.id ?? req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Login required" } });
        }
        const { type, entityType, entityId, meta } = req.body || {};
        const ip = req.ip || req.connection?.remoteAddress || "";
        const result = await analyticsService.trackEvent(userId, { type, entityType, entityId, meta }, { ip });
        if (!result) {
            return res.status(400).json({ error: { code: "INVALID_EVENT", message: "Invalid event type or rate limited" } });
        }
        if (result.ignored) {
            return res.status(200).json({ ok: true, ignored: true, reason: result.reason });
        }
        return res.status(201).json({ ok: true, success: true, event: result.event });
    } catch (err) {
        return res.status(500).json({ error: { code: "SERVER_ERROR", message: err.message || "Failed to track event" } });
    }
}

async function getUserAnalytics(req, res) {
    try {
        const userId = req.params.userId || req.user?.id || req.user?.userId;
        if (!userId) {
            return res.status(400).json({ error: { code: "BAD_REQUEST", message: "userId required" } });
        }
        const isOwn = String(userId) === String(req.user?.id ?? req.user?.userId);
        if (!isOwn) {
            return res.status(403).json({ error: { code: "FORBIDDEN", message: "Can only view own analytics" } });
        }
        const range = req.query.range || "28";
        const data = await analyticsService.getUserAnalytics(userId, range);
        console.log("[analytics.controller] getUserAnalytics:", { userId, range, totalViews: data.summary.totalViews });
        return res.json(data);
    } catch (err) {
        return res.status(500).json({ error: { code: "SERVER_ERROR", message: err.message || "Failed to fetch analytics" } });
    }
}

async function getAdminOverview(req, res) {
    try {
        const range = req.query.range || "28";
        const data = await analyticsService.getAdminOverview(range);
        console.log("[analytics.controller] getAdminOverview:", { range, totals: data.totals });
        return res.json(data);
    } catch (err) {
        return res.status(500).json({ error: { code: "SERVER_ERROR", message: err.message || "Failed to fetch overview" } });
    }
}

async function getAdminUserActivity(req, res) {
    try {
        const userId = req.params.userId;
        if (!userId) {
            return res.status(400).json({ error: { code: "BAD_REQUEST", message: "userId required" } });
        }
        const range = req.query.range || "28";
        const data = await analyticsService.getAdminUserActivity(userId, range);
        return res.json(data);
    } catch (err) {
        return res.status(500).json({ error: { code: "SERVER_ERROR", message: err.message || "Failed to fetch user activity" } });
    }
}

async function devSeed(req, res) {
    try {
        if (process.env.NODE_ENV === "production") {
            return res.status(403).json({ error: { code: "FORBIDDEN", message: "Dev seed disabled in production" } });
        }
        const days = Math.min(90, Math.max(7, parseInt(req.query.days, 10) || 30));
        const users = Math.min(200, Math.max(1, parseInt(req.query.users, 10) || 50));
        const creators = Math.min(users, Math.max(0, parseInt(req.query.creators, 10) || Math.min(10, users)));
        const result = await analyticsService.seedAnalytics({ days, users, creators });
        return res.json({ ok: true, ...result });
    } catch (err) {
        return res.status(500).json({ error: { code: "SERVER_ERROR", message: err.message || "Seed failed" } });
    }
}

module.exports = {
    trackEvent,
    getUserAnalytics,
    getAdminOverview,
    getAdminUserActivity,
    devSeed,
};
