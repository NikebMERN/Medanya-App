// src/modules/feed/feed.routes.js
const express = require("express");
const router = express.Router();

const controller = require("./feed.controller");

// Public endpoints
router.get("/feed", controller.getFeed);
router.get("/feed/highlights", controller.highlights);
router.get("/feed/home", controller.getHomeFeed);
router.get("/feed/home/live", controller.getLiveStreams);

module.exports = router;
