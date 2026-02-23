// src/modules/kyc/kyc.controller.js
const service = require("./kyc.service");

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
                        : 500;
    return res.status(status).json({ error: { code, message: err.message || code } });
}

async function submit(req, res) {
    try {
        const result = await service.submit(req.user, req.body);
        res.json({ success: true, ...result });
    } catch (e) {
        sendErr(res, e);
    }
}

async function getStatus(req, res) {
    try {
        const result = await service.getStatus(req.user);
        res.json({ success: true, ...result });
    } catch (e) {
        sendErr(res, e);
    }
}

async function confirmDataChange(req, res) {
    try {
        const result = await service.confirmDataChange(req.user, req.params.submissionId);
        res.json(result);
    } catch (e) {
        sendErr(res, e);
    }
}

async function adminGetSubmission(req, res) {
    try {
        const result = await service.adminGetSubmission(req.params.id);
        if (!result) return res.status(404).json({ error: { code: "NOT_FOUND", message: "KYC submission not found" } });
        res.json({ success: true, ...result });
    } catch (e) {
        sendErr(res, e);
    }
}

async function adminList(req, res) {
    try {
        const status = req.query.status || "pending_manual";
        const result = await service.adminListByStatus(status, {
            page: req.query.page,
            limit: req.query.limit,
        });
        res.json({ success: true, ...result });
    } catch (e) {
        sendErr(res, e);
    }
}

async function adminApprove(req, res) {
    try {
        const adminId = req.user?.id ?? req.user?.userId;
        const faceVerified = req.body?.faceVerified === true;
        const result = await service.adminApprove(req.params.submissionId, adminId, { faceVerified });
        res.json({ success: true, submission: result });
    } catch (e) {
        sendErr(res, e);
    }
}

async function adminReject(req, res) {
    try {
        const adminId = req.user?.id ?? req.user?.userId;
        const reason = req.body?.reason;
        const result = await service.adminReject(
            req.params.submissionId,
            adminId,
            reason,
        );
        res.json({ success: true, submission: result });
    } catch (e) {
        sendErr(res, e);
    }
}

async function adminListUsersWithKyc(req, res) {
    try {
        const result = await service.adminListUsersWithKycStatus(req.query);
        res.json({ success: true, ...result });
    } catch (e) {
        sendErr(res, e);
    }
}

async function adminRequestOtp(req, res) {
    try {
        const result = await service.adminRequestOtp(req.user, req.body?.userId);
        res.json({ success: true, ...result });
    } catch (e) {
        sendErr(res, e);
    }
}

async function adminVerifyOtp(req, res) {
    try {
        const result = await service.adminVerifyOtp(
            req.user,
            req.body?.userId,
            req.body?.otp,
        );
        res.json({ success: true, ...result });
    } catch (e) {
        sendErr(res, e);
    }
}

async function adminGetUserKycData(req, res) {
    try {
        const result = await service.adminGetUserKycData(
            req.user,
            req.params.userId,
        );
        res.json({ success: true, data: result });
    } catch (e) {
        sendErr(res, e);
    }
}

module.exports = {
    submit,
    getStatus,
    confirmDataChange,
    adminGetSubmission,
    adminList,
    adminApprove,
    adminReject,
    adminListUsersWithKyc,
    adminRequestOtp,
    adminVerifyOtp,
    adminGetUserKycData,
};
