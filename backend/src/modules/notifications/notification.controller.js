// src/modules/notifications/notification.controller.js
const service = require("./notification.service");

function sendErr(res, err) {
    const code = err.code || "SERVER_ERROR";
    const status =
        code === "UNAUTHORIZED"
            ? 401
            : code === "FORBIDDEN"
                ? 403
                : code === "VALIDATION_ERROR"
                    ? 400
                    : 500;

    return res
        .status(status)
        .json({ error: { code, message: err.message || code } });
}

// User
const upsertToken = async (req, res) => {
    try {
        const out = await service.upsertDeviceToken(req.user, req.body);
        return res.status(201).json({ success: true, ...out });
    } catch (e) {
        return sendErr(res, e);
    }
};

const deleteToken = async (req, res) => {
    try {
        const out = await service.removeDeviceToken(req.user, req.body);
        return res.json({ success: true, ...out });
    } catch (e) {
        return sendErr(res, e);
    }
};

const me = async (req, res) => {
    try {
        const out = await service.listMyLogs(req.user, req.query);
        return res.json({ success: true, ...out });
    } catch (e) {
        return sendErr(res, e);
    }
};

// Admin
const adminSend = async (req, res) => {
    try {
        const out = await service.sendToUsers(req.body);
        return res.status(202).json({ success: true, ...out });
    } catch (e) {
        return sendErr(res, e);
    }
};

const adminTopic = async (req, res) => {
    try {
        const out = await service.sendToTopic(req.body);
        return res.status(202).json({ success: true, ...out });
    } catch (e) {
        return sendErr(res, e);
    }
};

module.exports = { upsertToken, deleteToken, me, adminSend, adminTopic };
