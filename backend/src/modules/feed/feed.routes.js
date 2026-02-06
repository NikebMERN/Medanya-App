// src/modules/feed/feed.routes.js
const express = require("express");
const router = express.Router();

const controller = require("./feed.controller");

// Public endpoints
router.get("/feed", controller.getFeed);
router.get("/feed/highlights", controller.highlights);

module.exports = router;
