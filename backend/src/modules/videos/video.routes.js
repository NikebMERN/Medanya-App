// src/modules/videos/video.routes.js
const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/admin.middleware");
const controller = require("./video.controller");

// Light in-memory rate limiter
function rateLimit({ windowMs = 60_000, max = 10 }) {
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
            return res
                .status(429)
                .json({
                    error: {
                        code: "RATE_LIMIT",
                        message: "Too many requests, try later",
                    },
                });
        }
        entry.count += 1;
        return next();
    };
}

const createLimiter = rateLimit({ windowMs: 60_000, max: 4 });
const commentLimiter = rateLimit({ windowMs: 60_000, max: 12 });
const reportLimiter = rateLimit({ windowMs: 60_000, max: 6 });

// Public
router.get("/videos", controller.list);
router.get("/videos/:id", controller.detail);
router.get("/videos/:id/comments", controller.listComments);

// User (auth)
router.post("/videos", auth, createLimiter, controller.create);
router.post("/videos/:id/like", auth, controller.like);
router.delete("/videos/:id/like", auth, controller.unlike);
router.post("/videos/:id/comments", auth, commentLimiter, controller.comment);
router.delete(
    "/videos/:id/comments/:commentId",
    auth,
    controller.deleteComment,
);
router.post("/videos/:id/report", auth, reportLimiter, controller.report);
router.delete("/videos/:id", auth, controller.remove);
router.post("/videos/:id/pin-listing", auth, controller.pinListing);
router.get("/videos/:id/pins", controller.getPins);

// Admin moderation
router.get("/admin/videos", auth, requireRole("admin"), controller.adminList);
router.patch(
    "/admin/videos/:id/approve",
    auth,
    requireRole("admin"),
    controller.approve,
);
router.patch(
    "/admin/videos/:id/reject",
    auth,
    requireRole("admin"),
    controller.reject,
);
router.patch(
    "/admin/videos/:id/hide",
    auth,
    requireRole("admin"),
    controller.hide,
);

module.exports = router;
