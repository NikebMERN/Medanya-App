// src/modules/livestream/stream.routes.js
const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/admin.middleware");
const controller = require("./stream.controller");
const payments = require("../../config/payments");

// Public
router.get("/streams", controller.list);
router.get("/streams/:id", controller.detail);

// Gifts catalog (public)
router.get("/gifts", (req, res) => {
    return res.json({ success: true, gifts: payments.gifts });
});

// Auth required
router.post("/streams", auth, controller.create);
router.post("/streams/:id/token", auth, controller.token);
router.post("/streams/:id/end", auth, controller.end);

// Admin
router.patch(
    "/admin/streams/:id/ban",
    auth,
    requireRole("admin"),
    controller.ban,
);

module.exports = router;
