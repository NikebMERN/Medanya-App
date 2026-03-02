// src/modules/inAppNotifications/inAppNotifications.controller.js
const service = require("./inAppNotifications.service");

function sendErr(res, err) {
    const code = err.code || "SERVER_ERROR";
    let status = 500;
    if (code === "UNAUTHORIZED") status = 401;
    return res.status(status).json({ error: { code, message: err.message || code } });
}

async function list(req, res) {
    try {
        const data = await service.listByUser(req.user, req.query);
        return res.json({ success: true, ...data });
    } catch (err) {
        return sendErr(res, err);
    }
}

async function unseenCount(req, res) {
    try {
        const count = await service.getUnseenCount(req.user);
        return res.json({ success: true, count });
    } catch (err) {
        return sendErr(res, err);
    }
}

async function markSeen(req, res) {
    try {
        const affected = await service.markSeen(req.user, req.params.id);
        return res.json({ success: true, affected });
    } catch (err) {
        return sendErr(res, err);
    }
}

async function markAllSeen(req, res) {
    try {
        const affected = await service.markAllSeen(req.user);
        return res.json({ success: true, affected });
    } catch (err) {
        return sendErr(res, err);
    }
}

async function remove(req, res) {
    try {
        const affected = await service.deleteById(req.user, req.params.id);
        return res.json({ success: true, affected });
    } catch (err) {
        return sendErr(res, err);
    }
}

module.exports = { list, unseenCount, markSeen, markAllSeen, remove };
