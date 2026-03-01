// src/webhooks/stripe.webhook.js
const express = require("express");
const router = express.Router();
const stripeService = require("../modules/payments/stripe.service");

// Body is already parsed as raw by app.js for /api/webhooks/stripe
router.post("/webhooks/stripe", async (req, res) => {
        try {
            const sig = req.headers["stripe-signature"];
            const result = await stripeService.handleWebhook(req.body, sig);
            return res.json(result);
        } catch (e) {
            const code = e.code || "WEBHOOK_ERROR";
            return res
                .status(400)
                .json({ error: { code, message: e.message || code } });
        }
    },
);

module.exports = router;
