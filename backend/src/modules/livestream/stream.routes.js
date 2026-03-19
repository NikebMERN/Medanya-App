// src/modules/livestream/stream.routes.js
const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const optionalAuth = require("../../middlewares/auth.middleware").optional;
const { requireRole } = require("../../middlewares/admin.middleware");
const controller = require("./stream.controller");
const payments = require("../../config/payments");

// Public
router.get("/streams", controller.list);
router.get("/streams/home-following", optionalAuth, controller.homeFollowing);
router.get("/streams/my-active", auth, controller.myActive); // must be before :id
router.get("/streams/:id", controller.detail);

// Gifts catalog (public)
router.get("/gifts", (req, res) => {
    return res.json({ success: true, gifts: payments.gifts });
});

// Auth required
router.post("/streams", auth, controller.create);
router.post("/live/create", auth, controller.create);
router.post("/streams/:id/token", auth, controller.token);
router.post("/streams/:id/end", auth, controller.end);
router.post("/live/:id/pin", auth, controller.pinListing);
router.get("/live/:id/pins", controller.getPins);
router.post("/streams/:id/pin", auth, controller.pinListing);
router.get("/streams/:id/pins", controller.getPins);

// Admin
router.post("/admin/streams/:id/end", auth, requireRole("admin"), controller.adminEnd);
router.patch("/admin/streams/:id/ban", auth, requireRole("admin"), controller.ban);

module.exports = router;
