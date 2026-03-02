// src/modules/payments/stripe.controller.js
const service = require("./stripe.service");
const connectService = require("./stripeConnect.service");

function sendErr(res, err) {
    const code = err.code || "SERVER_ERROR";
    const status =
        code === "UNAUTHORIZED"
            ? 401
            : code === "FORBIDDEN"
                ? 403
                : code === "VALIDATION_ERROR" || code === "CONNECT_NOT_ENABLED" || code === "STRIPE_ERROR" || code === "INVALID_URL"
                    ? 400
                    : code === "CONFIG_ERROR"
                        ? 500
                        : code === "WEBHOOK_SIGNATURE_INVALID"
                            ? 400
                            : 500;

    return res
        .status(status)
        .json({ error: { code, message: err.message || code } });
}

const packages = (req, res) => {
    return res.json({ success: true, packages: service.listPackages() });
};

const createCheckout = async (req, res) => {
    try {
        const userId = req.user?.id ?? req.user?.userId;
        if (!userId)
            throw Object.assign(new Error("Auth required"), { code: "UNAUTHORIZED" });

        const { packageId } = req.body || {};
        const data = await service.createCheckoutSession({ userId, packageId });
        return res.status(201).json({ success: true, ...data });
    } catch (e) {
        return sendErr(res, e);
    }
};

const verifySession = async (req, res) => {
    try {
        const sessionId = req.body?.sessionId ?? req.body?.session_id ?? req.query?.session_id;
        const result = await service.verifyCheckoutSession(sessionId);
        return res.json({ success: true, ...result });
    } catch (e) {
        return sendErr(res, e);
    }
};

const connectOnboard = async (req, res) => {
    try {
        const userId = req.user?.id ?? req.user?.userId;
        if (!userId) throw Object.assign(new Error("Auth required"), { code: "UNAUTHORIZED" });
        const data = await connectService.createOnboardingLink(userId);
        return res.json({ success: true, url: data.url });
    } catch (e) {
        return sendErr(res, e);
    }
};

const connectStatus = async (req, res) => {
    try {
        const userId = req.user?.id ?? req.user?.userId;
        if (!userId) throw Object.assign(new Error("Auth required"), { code: "UNAUTHORIZED" });
        const status = await connectService.getConnectStatus(userId);
        return res.json({ success: true, ...status });
    } catch (e) {
        return sendErr(res, e);
    }
};

module.exports = { packages, createCheckout, verifySession, connectOnboard, connectStatus };
