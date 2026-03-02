/**
 * Veriff webhooks: decision + events.
 * IMPORTANT: Use express.raw() - RAW BODY is signed. Do NOT parse JSON before HMAC verification.
 * Headers: X-HMAC-SIGNATURE, X-AUTH-CLIENT
 */
const express = require("express");
const router = express.Router();
const veriffService = require("../services/veriff.service");
const providerService = require("../modules/kyc/kyc.provider.service");
const webhookEventDb = require("../modules/kyc/veriffWebhookEvent.mysql");

function sendErr(res, statusCode, code, message) {
    return res.status(statusCode).json({ error: { code, message: message || code } });
}

function getRawBodyString(rawBody) {
    return typeof rawBody === "string" ? rawBody : (rawBody && rawBody.toString ? rawBody.toString("utf8") : String(rawBody || ""));
}

router.post(
    "/webhooks/veriff/decision",
    express.raw({ type: "application/json" }),
    async (req, res) => {
        const rawBody = req.body;
        const rawBodyStr = getRawBodyString(rawBody);
        const signature = req.headers["x-hmac-signature"];
        const authClient = req.headers["x-auth-client"];
        let payload = null;
        let sessionId = null;

        try {
            // 1) Verify X-AUTH-CLIENT
            const apiKey = process.env.VERIFF_API_KEY;
            if (apiKey && authClient !== apiKey) {
                const errText = "X-AUTH-CLIENT does not match API key";
                await webhookEventDb.insertEvent({
                    kind: "DECISION",
                    sessionId: null,
                    headersJson: { "x-hmac-signature": !!signature, "x-auth-client": authClient ? "***" : null },
                    payloadRaw: rawBodyStr,
                    payloadJson: null,
                    signatureValid: false,
                    errorText: errText,
                }).catch(() => {});
                return sendErr(res, 401, "INVALID_AUTH", errText);
            }

            // 2) Verify HMAC BEFORE parsing - raw body is signed
            const signatureValid = veriffService.verifyWebhookSignature(rawBody, signature);
            if (!signatureValid) {
                await webhookEventDb.insertEvent({
                    kind: "DECISION",
                    sessionId: null,
                    headersJson: { "x-hmac-signature": !!signature, "x-auth-client": authClient ? "***" : null },
                    payloadRaw: rawBodyStr,
                    payloadJson: null,
                    signatureValid: false,
                    errorText: "Signature verification failed",
                }).catch(() => {});
                return sendErr(res, 401, "INVALID_SIGNATURE", "Webhook signature verification failed");
            }

            // 3) Parse JSON after verification
            try {
                payload = JSON.parse(rawBodyStr);
            } catch (parseErr) {
                const errText = `Payload parse error: ${parseErr.message}`;
                await webhookEventDb.insertEvent({
                    kind: "DECISION",
                    sessionId: null,
                    headersJson: { "x-hmac-signature": !!signature, "x-auth-client": authClient ? "***" : null },
                    payloadRaw: rawBodyStr,
                    payloadJson: null,
                    signatureValid: true,
                    errorText: errText,
                }).catch(() => {});
                return sendErr(res, 400, "INVALID_JSON", errText);
            }

            sessionId = payload?.verification?.id || payload?.id || payload?.sessionId || payload?.verification?.sessionId;

            await webhookEventDb.insertEvent({
                kind: "DECISION",
                sessionId: sessionId ? String(sessionId) : null,
                headersJson: { "x-hmac-signature": !!signature, "x-auth-client": authClient ? "***" : null },
                payloadRaw: rawBodyStr,
                payloadJson: payload,
                signatureValid: true,
                errorText: null,
            }).catch(() => {});

            const result = await providerService.handleVeriffDecision(payload);

            return res.status(200).json({ success: true, ...result });
        } catch (e) {
            const errText = e.message || String(e);
            await webhookEventDb.insertEvent({
                kind: "DECISION",
                sessionId: sessionId ? String(sessionId) : null,
                headersJson: { "x-hmac-signature": !!signature, "x-auth-client": authClient ? "***" : null },
                payloadRaw: rawBodyStr,
                payloadJson: payload,
                signatureValid: false,
                errorText: errText,
            }).catch(() => {});
            const statusCode = e.code === "SESSION_NOT_FOUND" ? 404 : e.code === "INVALID_SIGNATURE" ? 401 : 400;
            return sendErr(res, statusCode, e.code || "WEBHOOK_ERROR", errText);
        }
    }
);

function createEventHandler() {
    return async (req, res) => {
        const rawBody = req.body;
        const rawBodyStr = getRawBodyString(rawBody);
        const signature = req.headers["x-hmac-signature"];
        const authClient = req.headers["x-auth-client"];
        let payload = null;
        let sessionId = null;

        try {
            const apiKey = process.env.VERIFF_API_KEY;
            if (apiKey && authClient !== apiKey) {
                await webhookEventDb.insertEvent({
                    kind: "EVENT",
                    sessionId: null,
                    headersJson: { "x-hmac-signature": !!signature, "x-auth-client": authClient ? "***" : null },
                    payloadRaw: rawBodyStr,
                    payloadJson: null,
                    signatureValid: false,
                    errorText: "X-AUTH-CLIENT mismatch",
                }).catch(() => {});
                return sendErr(res, 401, "INVALID_AUTH", "X-AUTH-CLIENT does not match");
            }

            const signatureValid = veriffService.verifyWebhookSignature(rawBody, signature);
            if (!signatureValid) {
                await webhookEventDb.insertEvent({
                    kind: "EVENT",
                    sessionId: null,
                    headersJson: { "x-hmac-signature": !!signature, "x-auth-client": authClient ? "***" : null },
                    payloadRaw: rawBodyStr,
                    payloadJson: null,
                    signatureValid: false,
                    errorText: "Signature verification failed",
                }).catch(() => {});
                return sendErr(res, 401, "INVALID_SIGNATURE", "Webhook signature verification failed");
            }

            try {
                payload = JSON.parse(rawBodyStr);
            } catch (parseErr) {
                await webhookEventDb.insertEvent({
                    kind: "EVENT",
                    sessionId: null,
                    headersJson: {},
                    payloadRaw: rawBodyStr,
                    payloadJson: null,
                    signatureValid: true,
                    errorText: parseErr.message,
                }).catch(() => {});
                return sendErr(res, 400, "INVALID_JSON", parseErr.message);
            }

            sessionId = payload?.id || payload?.sessionId;

            await webhookEventDb.insertEvent({
                kind: "EVENT",
                sessionId: sessionId ? String(sessionId) : null,
                headersJson: { "x-hmac-signature": !!signature, "x-auth-client": authClient ? "***" : null },
                payloadRaw: rawBodyStr,
                payloadJson: payload,
                signatureValid: true,
                errorText: null,
            }).catch(() => {});

            const result = await providerService.handleVeriffEvents(payload);
            return res.status(200).json({ success: true, ...result });
        } catch (e) {
            const errText = e.message || String(e);
            await webhookEventDb.insertEvent({
                kind: "EVENT",
                sessionId: sessionId ? String(sessionId) : null,
                headersJson: {},
                payloadRaw: rawBodyStr,
                payloadJson: payload,
                signatureValid: false,
                errorText: errText,
            }).catch(() => {});
            const statusCode = e.code === "SESSION_NOT_FOUND" ? 404 : 401;
            return sendErr(res, statusCode, e.code || "WEBHOOK_ERROR", errText);
        }
    };
}

router.post(
    "/webhooks/veriff/events",
    express.raw({ type: "application/json" }),
    createEventHandler()
);

/** GET /veriff/callback - UX redirect. Mobile polls GET /kyc/status. */
router.get("/veriff/callback", (req, res) => {
    const redirectUrl = process.env.VERIFF_CALLBACK_REDIRECT_URL || process.env.APP_URL || "medanya://veriff/done";
    const sessionId = req.query.session_id || req.query.sessionId || "";
    const target = sessionId ? `${redirectUrl}${redirectUrl.includes("?") ? "&" : "?"}session_id=${encodeURIComponent(sessionId)}` : redirectUrl;
    res.redirect(302, target);
});

module.exports = router;
