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
router.get("/reported-users/:userId/context", adminController.getReportContext);
router.post("/reported-users/:userId/safe", adminController.markUserSafe);
router.get("/users/:id/full", adminController.getUserFullData);

router.patch("/users/:id/role", validateRoleChange, adminController.setUserRole);

router.patch("/users/:id/ban", adminController.banUser);
router.patch("/users/:id/unban", adminController.unbanUser);

router.get("/kyc", kycController.adminList);
router.get("/kyc/submission/:id", kycController.adminGetSubmission);
router.get("/kyc/users", kycController.adminListUsersWithKyc);
router.post("/kyc/request-otp", kycController.adminRequestOtp);
router.post("/kyc/verify-otp", kycController.adminVerifyOtp);
router.get("/kyc/user/:userId/data", kycController.adminGetUserKycData);
router.patch("/kyc/:submissionId/approve", kycController.adminApprove);
router.patch("/kyc/:submissionId/reject", kycController.adminReject);

router.get("/reviews/listings", reviewsController.listFlaggedListings);
router.patch("/reviews/listings/:type/:id", reviewsController.updateListingStatus);

router.get("/moderation/counts", adminController.getModerationCounts);
router.get("/moderation/queue", adminController.listModerationQueue);
router.get("/moderation/item", adminController.getModerationItem);
router.patch("/moderation/action", adminController.moderationAction);

router.get("/users/:id/risk", adminController.getUserRisk);

// Reports (unified), Bans, Audit
const adminBansAudit = require("./adminBansAudit");
router.get("/reports", adminController.listReports);
router.patch("/reports/:id", adminController.updateReport);
router.get("/bans", adminController.listBans);
router.post("/bans", adminController.createBan);
router.delete("/bans/:id", adminController.deleteBan);
router.get("/audit", adminController.listAuditLog);

module.exports = router;
