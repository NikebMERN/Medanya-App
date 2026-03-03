const express = require("express");
const router = express.Router();
const auth = require("../../middlewares/auth.middleware");
const controller = require("./superlike.controller");

router.get("/superlikes/balance", auth, controller.getBalance);
router.post("/superlikes/earn/welcome", auth, controller.earnWelcome);
router.post("/superlikes/earn/ad", auth, controller.earnAd);
router.post("/superlikes/earn/referral", auth, controller.earnReferral);
router.post("/videos/:id/superlike", auth, controller.superlikeVideo);
router.post("/streams/:id/superlike", auth, controller.superlikeStream);
router.get("/creators/earnings/monthly", auth, controller.getCreatorEarnings);

module.exports = router;
