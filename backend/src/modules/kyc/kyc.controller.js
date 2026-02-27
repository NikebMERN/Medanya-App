// src/modules/kyc/kyc.controller.js
const service = require("./kyc.service");
const providerService = require("./kyc.provider.service");

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

async function startProviderKyc(req, res) {
    try {
        const result = await service.startProviderKyc(req.user);
        res.json({ success: true, ...result });
    } catch (e) {
        sendErr(res, e);
    }
}

async function startVeriffKyc(req, res) {
    try {
        const result = await service.startVeriffKyc(req.user);
        res.json({ success: true, ...result });
    } catch (e) {
        sendErr(res, e);
    }
}

async function getStatus(req, res) {
    try {
        const result = await service.getStatus(req.user);
        console.log("[Veriff] getKycStatus user", req.user?.id ?? req.user?.userId, "-> kycStatus:", result?.kycStatus ?? result?.kyc_status, "full:", result);
        res.json({ success: true, ...result });
    } catch (e) {
        sendErr(res, e);
    }
}

async function veriffSync(req, res) {
    try {
        const userId = String(req.user?.id ?? req.user?.userId ?? "");
        if (!userId) return sendErr(res, Object.assign(new Error("Unauthorized"), { code: "UNAUTHORIZED" }));
        const result = await providerService.veriffSyncDecision(userId);
        console.log("[Veriff] veriffSync user", userId, "-> kycStatus:", result.kycStatus, "updated:", result.updated, "full:", result);
        res.json({ success: true, kycStatus: result.kycStatus, updated: result.updated });
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

async function adminVeriffDebug(req, res) {
    try {
        const result = await service.adminVeriffDebug(req.params.sessionId);
        if (!result) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Session not found" } });
        res.json({ success: true, ...result });
    } catch (e) {
        sendErr(res, e);
    }
}

async function adminVeriffWebhooks(req, res) {
    try {
        const sessionId = req.query.sessionId || req.query.session_id || "";
        if (!sessionId.trim()) {
            return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "sessionId query param required" } });
        }
        const result = await service.adminVeriffWebhooks(sessionId.trim());
        res.json({ success: true, events: result });
    } catch (e) {
        sendErr(res, e);
    }
}

module.exports = {
    submit,
    startProviderKyc,
    startVeriffKyc,
    getStatus,
    veriffSync,
    confirmDataChange,
    adminGetSubmission,
    adminList,
    adminApprove,
    adminReject,
    adminListUsersWithKyc,
    adminRequestOtp,
    adminVerifyOtp,
    adminGetUserKycData,
    adminVeriffDebug,
    adminVeriffWebhooks,
};
