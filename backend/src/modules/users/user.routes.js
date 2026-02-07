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

router.get("/users/discover", auth, controller.discoverUsers);
router.post("/users/:id/follow", auth, controller.follow);
router.delete("/users/:id/follow", auth, controller.unfollow);
router.get("/users/:id/followers", auth, controller.followers);
router.get("/users/:id/following", auth, controller.following);

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
router.patch(
    "/admin/users/:id/verify",
    auth,
    requireRole("admin"),
    controller.adminVerify,
);

module.exports = router;
