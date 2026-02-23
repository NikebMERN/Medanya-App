// src/modules/unifiedReports/report.controller.js
const service = require("./report.service");

function sendError(res, err) {
    const code = err.code || "SERVER_ERROR";
    const status =
        code === "UNAUTHORIZED"
            ? 401
            : code === "FORBIDDEN"
                ? 403
                : code === "VALIDATION_ERROR"
                    ? 400
                    : code === "DUPLICATE_SPAM"
                        ? 429
                        : 500;
    return res.status(status).json({ error: { code, message: err.message || code } });
}

async function createReport(req, res) {
    try {
        const reporterId = req.user?.id ?? req.user?.userId;
        const result = await service.createReport(reporterId, req.body);

        const io = req.app.get("io");
        if (io && result.triggered && result.targetType === "LIVESTREAM") {
            io.emit("livestream_stop", { streamId: result.targetId, reason: "Report threshold" });
            io.to(`stream:${result.targetId}`).emit("stream_stopped", {
                streamId: result.targetId,
                reason: "Report threshold",
            });
        }

        return res.status(201).json({
            success: true,
            report: result.report,
            uniqueCount24h: result.uniqueCount24h,
            triggered: result.triggered,
        });
    } catch (err) {
        return sendError(res, err);
    }
}

module.exports = {
    createReport,
};
