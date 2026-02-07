// src/modules/severeAbuse/abuse.controller.js
const service = require("./abuse.service");

function sendErr(res, err) {
    const code = err.code || "SERVER_ERROR";
    const status =
        code === "UNAUTHORIZED"
            ? 401
            : code === "FORBIDDEN"
                ? 403
                : code === "NOT_FOUND"
                    ? 404
                    : code === "VALIDATION_ERROR"
                        ? 400
                        : code === "RATE_LIMIT"
                            ? 429
                            : 500;

    return res
        .status(status)
        .json({ error: { code, message: err.message || code } });
}

// User
const create = async (req, res) => {
    try {
        const doc = await service.createReport(req.user, req.body);
        return res.status(201).json({ success: true, report: doc });
    } catch (e) {
        return sendErr(res, e);
    }
};

const publicList = async (req, res) => {
    try {
        const data = await service.listPublic(req.query);
        return res.json({ success: true, ...data });
    } catch (e) {
        return sendErr(res, e);
    }
};

const mine = async (req, res) => {
    try {
        const data = await service.listMine(req.user, req.query);
        return res.json({ success: true, ...data });
    } catch (e) {
        return sendErr(res, e);
    }
};

// Admin
const adminList = async (req, res) => {
    try {
        const data = await service.adminList(req.query);
        return res.json({ success: true, ...data });
    } catch (e) {
        return sendErr(res, e);
    }
};

const approve = async (req, res) => {
    try {
        const doc = await service.approve(req.params.id);
        return res.json({ success: true, report: doc });
    } catch (e) {
        return sendErr(res, e);
    }
};

const reject = async (req, res) => {
    try {
        const doc = await service.reject(req.params.id, req.body?.note);
        return res.json({ success: true, report: doc });
    } catch (e) {
        return sendErr(res, e);
    }
};

module.exports = { create, publicList, mine, adminList, approve, reject };
