// src/modules/payments/stripe.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../../middlewares/auth.middleware");
const controller = require("./stripe.controller");

// Public: list coin packages
router.get("/payments/stripe/packages", controller.packages);

// Auth: create checkout session
router.post("/payments/stripe/checkout", auth, controller.createCheckout);

module.exports = router;
