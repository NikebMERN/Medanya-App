// src/modules/payments/stripe.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../../middlewares/auth.middleware");
const controller = require("./stripe.controller");

// Public: list coin packages
router.get("/payments/stripe/packages", controller.packages);

// Auth: create checkout session
router.post("/payments/stripe/checkout", auth, controller.createCheckout);

// Auth: verify checkout session after web payment (credits coins if not already)
router.post("/payments/stripe/verify-session", auth, controller.verifySession);
router.get("/payments/stripe/verify-session", auth, controller.verifySession);

// Stripe Connect: seller payouts to bank only after delivery confirmation
router.post("/payments/stripe/connect/onboard", auth, controller.connectOnboard);
router.get("/payments/stripe/connect/status", auth, controller.connectStatus);

module.exports = router;
