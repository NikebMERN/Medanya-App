// src/modules/marketplace/market.routes.js
const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const optionalAuth = require("../../middlewares/auth.middleware").optional;
const controller = require("./market.controller");

// Basic in-memory rate limit for posting
function createRateLimiter({ windowMs = 60_000, max = 5 }) {
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
                error: { code: "RATE_LIMIT", message: "Too many listings, try later" },
            });
        }
        entry.count += 1;
        return next();
    };
}
const postLimiter = createRateLimiter({ windowMs: 60_000, max: 3 });

// Public list/search/detail (optionalAuth for includeCreatorPending)
router.get("/marketplace/items", optionalAuth, controller.listItems);
router.get("/marketplace/search", optionalAuth, controller.search);
router.get("/marketplace/items/:id", controller.getItem);

// Protected create/update/sold/remove
router.post("/marketplace/items", auth, postLimiter, controller.createItem);
router.patch("/marketplace/items/:id", auth, controller.updateItem);
router.patch("/marketplace/items/:id/sold", auth, controller.markSold);
router.delete("/marketplace/items/:id", auth, controller.deleteItem);

// Favorites (auth)
router.get("/marketplace/favorites", auth, controller.listFavorites);
router.post("/marketplace/items/:id/favorite", auth, controller.addFavorite);
router.delete("/marketplace/items/:id/favorite", auth, controller.removeFavorite);

module.exports = router;
