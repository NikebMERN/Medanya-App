// src/modules/recommendations/recommendation.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../../middlewares/auth.middleware");
const controller = require("./recommendation.controller");

// GET /videos/recommendations - auth optional (personalized if logged in)
router.get("/videos/recommendations", auth.optional, controller.getRecommendations);
// POST /videos/events - auth required
router.post("/videos/events", auth, controller.postEvents);
// GET /videos/trending - public
router.get("/videos/trending", controller.getTrending);

module.exports = router;
