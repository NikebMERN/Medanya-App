// src/modules/missingPersons/missing.routes.js
const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const controller = require("./missing.controller");

function createRateLimiter({ windowMs = 60_000, max = 3 }) {
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
            return res
                .status(429)
                .json({
                    error: { code: "RATE_LIMIT", message: "Too many alerts. Try later." },
                });
        }
        entry.count += 1;
        return next();
    };
}
const createLimiter = createRateLimiter({ windowMs: 60_000, max: 3 });

// Public
router.get("/missing-persons", controller.list);
router.get("/missing-persons/:id", controller.detail);

// Protected
router.post("/missing-persons", auth, createLimiter, controller.create);
router.patch("/missing-persons/:id", auth, controller.update);
router.patch("/missing-persons/:id/close", auth, controller.close);

module.exports = router;
