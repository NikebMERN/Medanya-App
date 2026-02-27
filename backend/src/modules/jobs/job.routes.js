// src/modules/jobs/job.routes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middlewares/auth.middleware");
const optionalAuth = require("../../middlewares/auth.middleware").optional;
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

// Public list/search (optionalAuth for includeCreatorPending)
router.get("/", optionalAuth, jobController.listJobs);
router.get("/search", optionalAuth, jobController.searchJobs);
router.get("/my-applications", authMiddleware, jobController.listMyApplications);
router.get("/:id", jobController.getJob);

// Protected create/update/delete
router.post("/", authMiddleware, postLimiter, jobController.createJob);
router.patch("/:id", authMiddleware, jobController.updateJob);
router.delete("/:id", authMiddleware, jobController.deleteJob);

// Applications (auth)
router.post("/:id/apply", authMiddleware, jobController.applyToJob);
router.get("/:id/applications", authMiddleware, jobController.listJobApplications);
router.patch("/:id/applications/:applicationId", authMiddleware, jobController.patchApplicationStatus);

// Rating (auth)
router.post("/:id/rate", authMiddleware, jobController.rateJob);

module.exports = router;
