// src/modules/livestream/stream.controller.js
const service = require("./stream.service");

function sendErr(res, err) {
    const code = err.code || "SERVER_ERROR";
    const status =
        code === "UNAUTHORIZED"
            ? 401
            : code === "FORBIDDEN"
                ? 403
                : code === "NOT_FOUND"
                    ? 404
                    : code === "AGORA_NOT_CONFIGURED"
                        ? 503
                        : code === "STREAM_NOT_LIVE"
                            ? 409
                            : code === "INSUFFICIENT_FUNDS"
                                ? 409
                                : code === "INVALID_GIFT"
                                    ? 400
                                    : 500;

    return res
        .status(status)
        .json({ error: { code, message: err.message || code } });
}

const create = async (req, res) => {
    try {
        const stream = await service.createStream(req.user, req.body);
        return res.status(201).json({ success: true, stream });
    } catch (e) {
        return sendErr(res, e);
    }
};

const token = async (req, res) => {
    try {
        const data = await service.getToken(req.user, req.params.id);
        return res.json({ success: true, ...data });
    } catch (e) {
        return sendErr(res, e);
    }
};

const list = async (req, res) => {
    try {
        const data = await service.listStreams(req.query);
        return res.json({ success: true, ...data });
    } catch (e) {
        return sendErr(res, e);
    }
};

const detail = async (req, res) => {
    try {
        const stream = await service.getStream(req.params.id);
        return res.json({ success: true, stream });
    } catch (e) {
        return sendErr(res, e);
    }
};

const end = async (req, res) => {
    try {
        const stream = await service.endStream(req.user, req.params.id);
        return res.json({ success: true, stream });
    } catch (e) {
        return sendErr(res, e);
    }
};

const ban = async (req, res) => {
    try {
        const stream = await service.banStream(req.user, req.params.id);
        return res.json({ success: true, stream });
    } catch (e) {
        return sendErr(res, e);
    }
};

module.exports = { create, token, list, detail, end, ban };
