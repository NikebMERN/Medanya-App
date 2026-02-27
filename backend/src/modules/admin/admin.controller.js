// src/modules/admin/admin.controller.js
const adminService = require("./admin.service");
const moderationService = require("./moderation.service");
const adminBansAudit = require("./adminBansAudit");
const kycSessionsDb = require("../kyc/kycSessions.mysql");

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
        const { banned, banLevel } = req.body || {};
        const shouldBan = banned === true || (banLevel && banLevel !== "none");
        const updated = await adminService.banUser(userId, shouldBan);
        return res.json({ success: true, updated });
    } catch (err) {
        return next(err);
    }
};

const unbanUser = async (req, res, next) => {
    try {
        const userId = Number(req.params.id);
        const updated = await adminService.banUser(userId, false);
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

const getReportContext = async (req, res, next) => {
    try {
        const reportedUserId = req.params.userId;
        const reporterId = req.query.reporterId || null;
        const data = await adminService.getReportContext(reportedUserId, reporterId);
        return res.json({ success: true, ...data });
    } catch (err) {
        return next(err);
    }
};

const markUserSafe = async (req, res, next) => {
    try {
        const userId = req.params.userId;
        const data = await adminService.markUserSafe(userId);
        return res.json({ success: true, ...data });
    } catch (err) {
        return next(err);
    }
};

const getUserFullData = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const data = await adminService.getUserFullData(userId);
        if (!data) return res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
        return res.json({ success: true, ...data });
    } catch (err) {
        return next(err);
    }
};

const getModerationCounts = async (req, res, next) => {
    try {
        const data = await moderationService.getModerationCounts();
        return res.json({ success: true, ...data });
    } catch (err) {
        return next(err);
    }
};

const listModerationQueue = async (req, res, next) => {
    try {
        const data = await moderationService.listModerationQueue({
            status: req.query.status || "PENDING",
            targetType: req.query.targetType,
            priority: req.query.priority,
            limit: req.query.limit,
        });
        return res.json({ success: true, ...data });
    } catch (err) {
        return next(err);
    }
};

const getModerationItem = async (req, res, next) => {
    try {
        const { targetType, targetId } = req.query;
        if (!targetType || !targetId) {
            return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "targetType and targetId required" } });
        }
        const data = await moderationService.getModerationItemDetail(targetType, targetId);
        return res.json({ success: true, ...data });
    } catch (err) {
        return next(err);
    }
};

const moderationAction = async (req, res, next) => {
    try {
        const adminId = req.user?.id ?? req.user?.userId;
        const { actionType, targetType, targetId, reason, banLevel } = req.body;
        if (!actionType || !targetType || !targetId) {
            return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "actionType, targetType, targetId required" } });
        }
        const data = await moderationService.executeModerationAction(adminId, {
            actionType,
            targetType,
            targetId,
            reason,
            banLevel,
        });
        return res.json({ success: true, ...data });
    } catch (err) {
        return next(err);
    }
};

const listReports = async (req, res, next) => {
    try {
        const data = await adminBansAudit.listReports(req.query);
        return res.json({ success: true, ...data });
    } catch (err) {
        return next(err);
    }
};

const updateReport = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { action, reason } = req.body || {};
        const data = await adminBansAudit.updateReportStatus(id, action || "dismiss", reason);
        if (!data) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Report not found" } });
        return res.json({ success: true, report: data });
    } catch (err) {
        return next(err);
    }
};

const listBans = async (req, res, next) => {
    try {
        const data = await adminBansAudit.listBans(req.query);
        return res.json({ success: true, ...data });
    } catch (err) {
        return next(err);
    }
};

const createBan = async (req, res, next) => {
    try {
        const adminId = req.user?.id ?? req.user?.userId;
        const data = await adminBansAudit.createBan(req.body, adminId);
        return res.status(201).json({ success: true, ...data });
    } catch (err) {
        return next(err);
    }
};

const deleteBan = async (req, res, next) => {
    try {
        const ok = await adminBansAudit.deleteBan(req.params.id);
        if (!ok) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ban not found" } });
        return res.json({ success: true });
    } catch (err) {
        return next(err);
    }
};

const listAuditLog = async (req, res, next) => {
    try {
        const data = await adminBansAudit.listAuditLog(req.query);
        return res.json({ success: true, ...data });
    } catch (err) {
        return next(err);
    }
};

const listKycSessions = async (req, res, next) => {
    try {
        const data = await kycSessionsDb.listSessions({
            status: req.query.status,
            provider: req.query.provider,
            page: req.query.page,
            limit: req.query.limit,
        });
        return res.json({ success: true, ...data });
    } catch (err) {
        return next(err);
    }
};

const listLabelSamples = async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
        const scamTraining = require("../../services/scamML/scamTraining.mysql");
        const samples = await scamTraining.listSamplesNeedingLabel(limit);
        return res.json({ success: true, samples });
    } catch (err) {
        return next(err);
    }
};

const labelSample = async (req, res, next) => {
    try {
        const sampleId = parseInt(req.params.id, 10);
        const { label } = req.body || {};
        if (!["SCAM", "LEGIT"].includes(String(label || "").toUpperCase())) {
            return res.status(400).json({ success: false, error: "label must be SCAM or LEGIT" });
        }
        const scamTraining = require("../../services/scamML/scamTraining.mysql");
        const n = await scamTraining.updateLabelById(sampleId, String(label).toUpperCase(), "ADMIN");
        return res.json({ success: true, updated: n });
    } catch (err) {
        return next(err);
    }
};

module.exports = {
    health,
    listUsers,
    listReportedUsers,
    markUserSafe,
    getUserFullData,
    getReportContext,
    setUserRole,
    banUser,
    unbanUser,
    getUserRisk,
    getModerationCounts,
    listModerationQueue,
    getModerationItem,
    moderationAction,
    listReports,
    updateReport,
    listBans,
    createBan,
    deleteBan,
    listAuditLog,
    listKycSessions,
    listLabelSamples,
    labelSample,
};
