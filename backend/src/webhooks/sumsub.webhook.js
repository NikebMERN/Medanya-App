/**
 * Sumsub applicantReviewed webhook.
 * POST /webhooks/sumsub/applicantReviewed
 * Verify signature and update user/session from provider decision.
 */
const express = require("express");
const router = express.Router();
const sumsubService = require("../services/sumsub.service");
const providerService = require("../modules/kyc/kyc.provider.service");

function sendErr(res, code, message) {
    return res.status(400).json({ error: { code, message: message || code } });
}

router.post(
    "/webhooks/sumsub/applicantReviewed",
    express.raw({ type: "application/json" }),
    async (req, res) => {
        try {
            const rawBody = req.body;
            const digest = req.headers["x-payload-digest"] || req.headers["x-payload-digest-sha-256"];
            if (!sumsubService.verifyWebhookSignature(rawBody, digest)) {
                return sendErr(res, "INVALID_SIGNATURE", "Webhook signature verification failed");
            }
            const payload = JSON.parse(rawBody.toString("utf8"));
            if (payload?.type !== "applicantReviewed") {
                return res.json({ success: true, skipped: true, type: payload?.type });
            }
            const result = await providerService.handleSumsubApplicantReviewed(payload);
            return res.json({ success: true, ...result });
        } catch (e) {
            console.error("Sumsub webhook error:", e);
            return sendErr(res, e.code || "WEBHOOK_ERROR", e.message);
        }
    }
);

module.exports = router;
