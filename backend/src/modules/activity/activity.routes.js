// src/modules/activity/activity.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../../middlewares/auth.middleware");
const controller = require("./activity.controller");

router.post("/activity", auth, controller.log);

module.exports = router;
