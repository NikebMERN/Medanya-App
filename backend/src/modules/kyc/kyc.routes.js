// src/modules/kyc/kyc.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../../middlewares/auth.middleware");
const controller = require("./kyc.controller");

router.post("/submit", auth, controller.submit);
router.post("/start", auth, controller.startProviderKyc);
router.post("/veriff/start", auth, controller.startVeriffKyc);
router.post("/veriff/sync", auth, controller.veriffSync);
router.get("/status", auth, controller.getStatus);
router.post("/submissions/:submissionId/confirm-data-change", auth, controller.confirmDataChange);

module.exports = router;
