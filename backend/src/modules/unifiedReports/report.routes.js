// src/modules/unifiedReports/report.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../../middlewares/auth.middleware");
const controller = require("./report.controller");

function createRateLimiter({ windowMs = 60_000, max = 6 }) {
    const hits = new Map();
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

const reportLimiter = createRateLimiter({ windowMs: 60_000, max: 6 });

// Primary unified reporting API (spec: POST /reports)
router.post("/reports", auth, reportLimiter, controller.createReport);
// Legacy alias
router.post("/reports/unified", auth, reportLimiter, controller.createReport);

module.exports = router;
