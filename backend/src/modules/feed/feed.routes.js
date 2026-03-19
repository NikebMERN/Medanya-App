// src/modules/feed/feed.routes.js
const express = require("express");
const router = express.Router();

const controller = require("./feed.controller");
const optionalAuth = require("../../middlewares/auth.middleware").optional;

// Public endpoints
router.get("/feed", controller.getFeed);
router.get("/feed/highlights", controller.highlights);
router.get("/feed/home", controller.getHomeFeed);
router.get("/feed/home/live", controller.getLiveStreams);

// Personalized feed (optionalAuth - better results when logged in)
router.get("/feed/personalized", optionalAuth, controller.getPersonalizedFeed);

// Reports tab - safety content only
router.get("/feed/reports", controller.getReportsFeed);

module.exports = router;
