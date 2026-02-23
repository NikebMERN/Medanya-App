// src/modules/activity/activity.service.js
const Activity = require("./activity.model");

const ACTIONS = new Set([
    "view_job", "view_marketplace", "view_video", "enter_livestream", "view_profile",
    "send_chat", "create_job", "create_listing", "upload_video",
]);

async function logActivity(userId, { action, targetType = "", targetId = "", metadata = {} }) {
    if (!userId) return null;
    const a = String(action || "").trim();
    if (!ACTIONS.has(a)) return null;
    const doc = await Activity.create({
        userId: String(userId),
        action: a,
        targetType: String(targetType || "").slice(0, 50),
        targetId: String(targetId || "").slice(0, 100),
        metadata: typeof metadata === "object" ? metadata : {},
    });
    return doc.toObject();
}

async function getRecentActivities(userId, minutesBack = 20, limit = 50) {
    if (!userId) return [];
    const since = new Date(Date.now() - minutesBack * 60 * 1000);
    const items = await Activity.find({
        userId: String(userId),
        createdAt: { $gte: since },
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    return items;
}

module.exports = { logActivity, getRecentActivities };
