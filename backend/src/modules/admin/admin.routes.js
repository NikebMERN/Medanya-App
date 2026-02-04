// src/modules/admin/admin.routes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/admin.middleware");
const adminController = require("./admin.controller");
const { validateRoleChange, validateBanChange, validatePagination } = require("./admin.validation.js");

// All admin routes require JWT + admin role
router.use(authMiddleware);
router.use(requireRole("admin"));

router.get("/health", adminController.health);

router.get("/users", validatePagination, adminController.listUsers);

router.patch("/users/:id/role", validateRoleChange, adminController.setUserRole);

router.patch("/users/:id/ban", validateBanChange, adminController.banUser);

module.exports = router;
