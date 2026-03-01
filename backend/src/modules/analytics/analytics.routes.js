/**
 * Analytics routes — event tracking (auth) + user analytics (auth) + admin (RBAC).
 */
const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/admin.middleware");
const rateLimit = require("express-rate-limit");
const controller = require("./analytics.controller");

// Rate limit for event tracking — prevent spam
const eventLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: { code: "RATE_LIMIT", message: "Too many events" } },
});

router.post("/event", authMiddleware, eventLimiter, controller.trackEvent);
router.get("/user/me", authMiddleware, (req, res, next) => {
    req.params.userId = req.user?.id ?? req.user?.userId;
    return controller.getUserAnalytics(req, res, next);
});
router.get("/user/:userId", authMiddleware, controller.getUserAnalytics);

// Admin routes — require admin role
router.get("/admin/overview", authMiddleware, requireRole("admin"), controller.getAdminOverview);
router.get("/admin/users/:userId/activity", authMiddleware, requireRole("admin"), controller.getAdminUserActivity);

// Dev-only seed endpoint (non-production, admin only)
router.get("/dev/seed", authMiddleware, requireRole("admin"), controller.devSeed);

module.exports = router;
