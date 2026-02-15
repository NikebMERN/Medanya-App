// src/modules/kyc/kyc.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../../middlewares/auth.middleware");
const controller = require("./kyc.controller");

router.post("/submit", auth, controller.submit);
router.get("/status", auth, controller.getStatus);

module.exports = router;
