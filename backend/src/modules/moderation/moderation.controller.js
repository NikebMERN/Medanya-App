const moderationService = require("./moderation.service");
const { createReportAndCheckThreshold } = require("../../services/reportThreshold.service");
const Video = require("../videos/video.model");

function sendErr(res, err) {
    const code = err.code || "SERVER_ERROR";
    const status = code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : code === "VALIDATION_ERROR" ? 400 : 500;
    return res.status(status).json({ error: { code, message: err.message || code } });
}

async function createReport(req, res) {
    try {
        const userId = req.user?.id ?? req.user?.userId;
        if (!userId) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Auth required" } });
        const { targetType, targetId, reason } = req.body;
        if (!targetType || !targetId) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "targetType and targetId required" } });
        const allowed = ["video", "livestream", "job", "market", "user"];
        if (!allowed.includes(targetType)) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid targetType" } });

        const result = await createReportAndCheckThreshold({
            targetType,
            targetId: String(targetId),
            reporterId: String(userId),
            reason: reason || "other",
        });
        const io = req.app.get("io");
        if (io && result.triggered) {
            if (targetType === "video") {
                io.emit("content_removed", { targetType: "video", targetId, action: "auto_hidden" });
                io.emit("video_removed", { videoId: targetId, status: "HIDDEN_PENDING_REVIEW" });
                io.to(`video:${targetId}`).emit("video_removed", { videoId: targetId, status: "HIDDEN_PENDING_REVIEW" });
            }
            if (targetType === "livestream") {
            io.emit("livestream_stop", { streamId: targetId, reason: "Report threshold" });
            io.to(`stream:${targetId}`).emit("stream_stopped", { streamId: targetId, reason: "Report threshold" });
        }
        }
        return res.status(201).json({ success: true, ...result });
    } catch (e) {
        return sendErr(res, e);
    }
}

async function getModerationQueue(req, res) {
    try {
        const data = await moderationService.getModerationQueue(req.query);
        return res.json({ success: true, ...data });
    } catch (e) {
        return sendErr(res, e);
    }
}

async function adminListStreams(req, res) {
    try {
        const status = String(req.query?.status || "stopped_pending_review");
        const data = await moderationService.listStreamsForModeration({ status });
        return res.json({ success: true, ...data });
    } catch (e) {
        return sendErr(res, e);
    }
}

async function adminListVideos(req, res) {
    try {
        const status = String(req.query?.status || "HIDDEN_PENDING_REVIEW");
        const q = status ? { status: { $in: [status, status === "HIDDEN_PENDING_REVIEW" ? "hidden" : status] } } : {};
        const videos = await Video.find(q).sort({ updatedAt: -1 }).limit(100).lean();
        return res.json({ success: true, videos });
    } catch (e) {
        return sendErr(res, e);
    }
}

async function patchVideoModeration(req, res) {
    try {
        const action = req.body?.action || req.query?.action;
        const adminId = req.user?.id ?? req.user?.userId;
        const result = await moderationService.moderationVideoAction(req.params.id, action, adminId);
        if (!result) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid action or video" } });
        const io = req.app.get("io");
        if (io && (action === "delete" || action === "ban_user")) {
            io.emit("content_removed", { targetType: "video", targetId: req.params.id, action });
            io.emit("video_removed", { videoId: req.params.id, status: "DELETED" });
            io.to(`video:${req.params.id}`).emit("video_removed", { videoId: req.params.id, status: "DELETED" });
            if (result.video?.createdBy) io.to(`user:${result.video.createdBy}`).emit("user_banned", { reason: "Moderation" });
        }
        return res.json({ success: true, ...result });
    } catch (e) {
        return sendErr(res, e);
    }
}

async function patchStreamModeration(req, res) {
    try {
        const action = req.body?.action || req.query?.action;
        const adminId = req.user?.id ?? req.user?.userId;
        const result = await moderationService.moderationStreamAction(req.params.id, action, adminId);
        if (!result) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid action or stream" } });
        const io = req.app.get("io");
        if (io && (result.stream || result.action === "deleted")) {
            io.emit("livestream_stop", { streamId: req.params.id, reason: "Moderation", action: result.action });
            io.to(`stream:${req.params.id}`).emit("stream_stopped", { streamId: req.params.id, reason: "Moderation", action: result.action });
            if ((action === "ban_user" || action === "ban_phone") && result.stream?.hostId) {
                io.to(`user:${result.stream.hostId}`).emit("user_banned", { reason: "Moderation" });
            }
        }
        return res.json({ success: true, ...result });
    } catch (e) {
        return sendErr(res, e);
    }
}

module.exports = {
    createReport,
    getModerationQueue,
    adminListVideos,
    adminListStreams,
    patchVideoModeration,
    patchStreamModeration,
};
