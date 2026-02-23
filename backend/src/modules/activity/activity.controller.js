// src/modules/activity/activity.controller.js
const activityService = require("./activity.service");

async function log(req, res) {
    try {
        const userId = req.user?.id ?? req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Login required" } });
        }
        const { action, targetType, targetId, metadata } = req.body || {};
        const result = await activityService.logActivity(userId, {
            action,
            targetType,
            targetId,
            metadata,
        });
        return res.status(201).json({ success: true, logged: !!result });
    } catch (err) {
        return res.status(500).json({
            error: { code: "SERVER_ERROR", message: err.message || "Failed to log activity" },
        });
    }
}

module.exports = { log };
