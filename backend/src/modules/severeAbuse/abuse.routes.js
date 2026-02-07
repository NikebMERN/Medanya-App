// src/modules/severeAbuse/abuse.routes.js
const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/admin.middleware");
const controller = require("./abuse.controller");

// JWT optional for create: we do NOT require auth middleware here
router.post("/severe-abuse", controller.create);

// Public approved list
router.get("/severe-abuse/public", controller.publicList);

// Mine requires JWT
router.get("/severe-abuse/mine", auth, controller.mine);

// Admin
router.get(
    "/admin/severe-abuse",
    auth,
    requireRole("admin"),
    controller.adminList,
);
router.patch(
    "/admin/severe-abuse/:id/approve",
    auth,
    requireRole("admin"),
    controller.approve,
);
router.patch(
    "/admin/severe-abuse/:id/reject",
    auth,
    requireRole("admin"),
    controller.reject,
);

module.exports = router;
