// src/modules/wallet/wallet.routes.js
const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/admin.middleware");
const controller = require("./wallet.controller");

// user
router.get("/wallet/me", auth, controller.me);
router.get("/wallet/transactions", auth, controller.myTransactions);
router.post("/wallet/recharge/create-intent", auth, controller.createRechargeIntent);
router.post("/wallet/support", auth, controller.support);

// admin
router.post(
    "/admin/wallet/credit",
    auth,
    requireRole("admin"),
    controller.adminCredit,
);
router.post(
    "/admin/wallet/debit",
    auth,
    requireRole("admin"),
    controller.adminDebit,
);

module.exports = router;
