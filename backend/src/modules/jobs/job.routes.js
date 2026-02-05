// src/modules/jobs/job.routes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middlewares/auth.middleware");
const jobController = require("./job.controller");

// Basic in-memory rate limit for POST /jobs (per IP)
function createRateLimiter({ windowMs = 60_000, max = 10 }) {
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
                error: { code: "RATE_LIMIT", message: "Too many job posts, try later" },
            });
        }
        entry.count += 1;
        return next();
    };
}

const postLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

// Public list/search
router.get("/", jobController.listJobs);
router.get("/search", jobController.searchJobs);
router.get("/:id", jobController.getJob);

// Protected create/update/delete
router.post("/", authMiddleware, postLimiter, jobController.createJob);
router.patch("/:id", authMiddleware, jobController.updateJob);
router.delete("/:id", authMiddleware, jobController.deleteJob);

module.exports = router;
