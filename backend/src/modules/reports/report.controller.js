// src/modules/reports/report.controller.js
const service = require("./report.service");
const listingReportService = require("./listingReport.service");
const { maskPhone, maskName, maskLocation } = require("../../utils/mask.util");

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
                        : code === "INVALID_REPORT"
                            ? 400
                            : code === "NOT_FOUND"
                                ? 404
                                : 500;

    return res
        .status(status)
        .json({ error: { code, message: err.message || code } });
}

function isAdmin(req) {
    return req.user?.role === "admin";
}

function maskSummary(s) {
    if (!s) return null;
    return {
        ...s,
        phoneNumber: maskPhone(s.phoneNumber),
        employerName: maskName(s.employerName),
        locationText: maskLocation(s.locationText),
    };
}

function maskReport(r) {
    return {
        ...r,
        reporterId: undefined, // never expose publicly
        phoneNumber: maskPhone(r.phoneNumber),
        employerName: maskName(r.employerName),
        locationText: maskLocation(r.locationText),
        gps: null, // hide exact GPS publicly
    };
}

const createReport = async (req, res) => {
    try {
        const reporterId = req.user.id ?? req.user.userId;
        const created = await service.createReport(reporterId, req.body);

        // Reporter sees full phone (optional). Keep it safe anyway:
        return res.status(201).json({ success: true, report: created });
    } catch (err) {
        return sendError(res, err);
    }
};

const mine = async (req, res) => {
    try {
        const reporterId = req.user.id ?? req.user.userId;
        const data = await service.listMyReports(reporterId, req.query);
        return res.json({ success: true, ...data });
    } catch (err) {
        return sendError(res, err);
    }
};

// Public/optional JWT
const blacklistSearch = async (req, res) => {
    try {
        const data = await service.searchBlacklist({
            phone: req.query.phone,
            name: req.query.name,
            location: req.query.location,
            page: req.query.page,
            limit: req.query.limit,
        });

        const masked = data.results.map(maskSummary);
        // ✅ most reported at top already (sorted in service)
        return res.json({
            success: true,
            page: data.page,
            limit: data.limit,
            results: masked,
        });
    } catch (err) {
        return sendError(res, err);
    }
};

const blacklistSummary = async (req, res) => {
    try {
        const phoneNumber = req.params.phoneNumber;
        const data = await service.getBlacklistSummary(phoneNumber, {
            reportsLimit: req.query.limit,
        });

        // If admin, show unmasked (optional); for public, mask.
        const admin = isAdmin(req);
        const summary = admin ? data.summary : maskSummary(data.summary);

        const recentReports = admin
            ? data.recentReports
            : data.recentReports.map(maskReport);

        // ✅ recentReports returned chronological (old->new), so “bottom” is newest in UI
        return res.json({ success: true, summary, recentReports });
    } catch (err) {
        return sendError(res, err);
    }
};

// Admin endpoints
const adminList = async (req, res) => {
    try {
        const data = await service.adminListReports(req.query);
        return res.json({ success: true, ...data });
    } catch (err) {
        return sendError(res, err);
    }
};

const adminApprove = async (req, res) => {
    try {
        const updated = await service.adminApprove(req.params.id);
        return res.json({ success: true, report: updated });
    } catch (err) {
        return sendError(res, err);
    }
};

const adminReject = async (req, res) => {
    try {
        const updated = await service.adminReject(req.params.id);
        return res.json({ success: true, report: updated });
    } catch (err) {
        return sendError(res, err);
    }
};

const createListingReport = async (req, res) => {
    try {
        const reporterId = req.user?.id ?? req.user?.userId;
        const created = await listingReportService.createListingReport(reporterId, req.body);
        return res.status(201).json({ success: true, report: created });
    } catch (err) {
        return sendError(res, err);
    }
};

module.exports = {
    createReport,
    createListingReport,
    mine,
    blacklistSearch,
    blacklistSummary,
    adminList,
    adminApprove,
    adminReject,
};
