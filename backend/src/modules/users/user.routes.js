// src/modules/users/user.routes.js
const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/admin.middleware");
const controller = require("./user.controller");

// User
router.get("/users/me", auth, controller.me);
router.patch("/users/me", auth, controller.patchMe);
router.delete("/users/me", auth, controller.deleteMe);

// Admin
router.get("/admin/users", auth, requireRole("admin"), controller.adminUsers);
router.patch(
    "/admin/users/:id/role",
    auth,
    requireRole("admin"),
    controller.adminRole,
);
router.patch(
    "/admin/users/:id/ban",
    auth,
    requireRole("admin"),
    controller.adminBan,
);

module.exports = router;
