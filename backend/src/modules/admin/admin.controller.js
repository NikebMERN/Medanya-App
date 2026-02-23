// src/modules/admin/admin.controller.js
const adminService = require("./admin.service");

const health = async (req, res) => {
    return res.json({ ok: true, serverTime: new Date().toISOString() });
};

const listReportedUsers = async (req, res, next) => {
    try {
        const { page, limit } = req.query;
        const data = await adminService.listReportedUsers({ page, limit });
        return res.json({ success: true, ...data });
    } catch (err) {
        return next(err);
    }
};

const listUsers = async (req, res, next) => {
    try {
        const { page, limit, query } = req.query;
        const data = await adminService.listUsers({ page, limit, query });
        return res.json({ success: true, ...data });
    } catch (err) {
        return next(err);
    }
};

const setUserRole = async (req, res, next) => {
    try {
        const userId = Number(req.params.id);
        const { role } = req.body;
        const currentUserId = req.user?.id ?? req.user?.userId;
        const updated = await adminService.setUserRole(userId, role, currentUserId);
        return res.json({ success: true, updated });
    } catch (err) {
        return next(err);
    }
};

const banUser = async (req, res, next) => {
    try {
        const userId = Number(req.params.id);
        const { banned } = req.body;
        const updated = await adminService.banUser(userId, banned);
        return res.json({ success: true, updated });
    } catch (err) {
        return next(err);
    }
};

const getUserRisk = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const data = await adminService.getUserRisk(userId);
        return res.json({ success: true, ...data });
    } catch (err) {
        return next(err);
    }
};

module.exports = { health, listUsers, listReportedUsers, setUserRole, banUser, getUserRisk };
