// src/modules/notifications/notification.routes.js
const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/admin.middleware");
const controller = require("./notification.controller");

// User
router.post("/notifications/device-token", auth, controller.upsertToken);
router.delete("/notifications/device-token", auth, controller.deleteToken);
router.get("/notifications/me", auth, controller.me);

// Admin
router.post(
    "/admin/notifications/send",
    auth,
    requireRole("admin"),
    controller.adminSend,
);
router.post(
    "/admin/notifications/topic",
    auth,
    requireRole("admin"),
    controller.adminTopic,
);

module.exports = router;
