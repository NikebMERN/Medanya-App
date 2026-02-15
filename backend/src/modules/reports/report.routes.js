// src/modules/reports/report.routes.js
const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/admin.middleware");
const controller = require("./report.controller");

// Basic in-memory rate limiter for report creation (per IP)
function createRateLimiter({ windowMs = 60_000, max = 6 }) {
    const hits = new Map(); // ip -> { count, resetAt }
    return (req, res, next) => {
        const ip = req.ip || req.connection?.remoteAddress || "unknown";
        const now = Date.now();
        const entry = hits.get(ip);
        if (!entry || now > entry.resetAt) {
            hits.set(ip, { count: 1, resetAt: now + windowMs });
            return next();
        }
        if (entry.count >= max) {
            return res.status(429).json({
                error: { code: "RATE_LIMIT", message: "Too many reports. Try later." },
            });
        }
        entry.count += 1;
        return next();
    };
}
const reportLimiter = createRateLimiter({ windowMs: 60_000, max: 4 });

// Reports (JWT)
router.post("/reports", auth, reportLimiter, controller.createReport);
router.post("/reports/listings", auth, reportLimiter, controller.createListingReport);
router.get("/reports/mine", auth, controller.mine);

// Blacklist (public, JWT optional)
// NOTE: keep public; controller masks sensitive values
router.get("/blacklist/search", controller.blacklistSearch);
router.get("/blacklist/:phoneNumber", controller.blacklistSummary);

// Admin review (admin only) — THIS IS NOT “BAN USER”, it is only approving reports
router.get("/admin/reports", auth, requireRole("admin"), controller.adminList);
router.patch(
    "/admin/reports/:id/approve",
    auth,
    requireRole("admin"),
    controller.adminApprove,
);
router.patch(
    "/admin/reports/:id/reject",
    auth,
    requireRole("admin"),
    controller.adminReject,
);

module.exports = router;
