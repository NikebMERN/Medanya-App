// src/modules/admin/admin.routes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/admin.middleware");
const adminController = require("./admin.controller");
const kycController = require("../kyc/kyc.controller");
const reviewsController = require("./reviews.controller");
const { validateRoleChange, validateBanChange, validatePagination } = require("./admin.validation.js");

// All admin routes require JWT + admin role
router.use(authMiddleware);
router.use(requireRole("admin"));

router.get("/health", adminController.health);

router.get("/users", validatePagination, adminController.listUsers);
router.get("/reported-users", validatePagination, adminController.listReportedUsers);

router.patch("/users/:id/role", validateRoleChange, adminController.setUserRole);

router.patch("/users/:id/ban", validateBanChange, adminController.banUser);

router.get("/kyc", kycController.adminList);
router.get("/kyc/users", kycController.adminListUsersWithKyc);
router.post("/kyc/request-otp", kycController.adminRequestOtp);
router.post("/kyc/verify-otp", kycController.adminVerifyOtp);
router.get("/kyc/user/:userId/data", kycController.adminGetUserKycData);
router.patch("/kyc/:submissionId/approve", kycController.adminApprove);
router.patch("/kyc/:submissionId/reject", kycController.adminReject);

router.get("/reviews/listings", reviewsController.listFlaggedListings);
router.patch("/reviews/listings/:type/:id", reviewsController.updateListingStatus);

router.get("/users/:id/risk", adminController.getUserRisk);

module.exports = router;
