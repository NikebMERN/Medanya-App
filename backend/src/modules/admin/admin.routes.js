// src/modules/admin/admin.routes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/admin.middleware");
const adminController = require("./admin.controller");
const kycController = require("../kyc/kyc.controller");
const reviewsController = require("./reviews.controller");
const { validateRoleChange, validateBanChange, validatePagination } = require("./admin.validation.js");

// Prevent caching so admin panel always gets fresh data
router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
});
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
router.get("/kyc/sessions", adminController.listKycSessions);
router.get("/kyc/submission/:id", kycController.adminGetSubmission);
router.get("/kyc/users", kycController.adminListUsersWithKyc);
router.post("/kyc/request-otp", kycController.adminRequestOtp);
router.post("/kyc/verify-otp", kycController.adminVerifyOtp);
router.get("/kyc/user/:userId/data", kycController.adminGetUserKycData);
router.get("/kyc/veriff/debug/:sessionId", kycController.adminVeriffDebug);
router.get("/veriff/webhooks", kycController.adminVeriffWebhooks);
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

router.get("/ml/samples", adminController.listLabelSamples);
router.patch("/ml/samples/:id/label", adminController.labelSample);
router.get("/ml/retrain-status", adminController.getRetrainStatus);
router.post("/ml/request-retrain", adminController.requestRetrain);
router.post("/ml/approve-retrain", adminController.approveRetrain);
router.post("/ml/reject-retrain", adminController.rejectRetrain);

router.get("/orders", adminController.listOrders);
router.get("/disputes", adminController.listDisputes);
router.post("/disputes/:id/resolve", adminController.resolveDispute);

module.exports = router;
