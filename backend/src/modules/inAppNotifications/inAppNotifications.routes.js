// src/modules/inAppNotifications/inAppNotifications.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../../middlewares/auth.middleware");
const controller = require("./inAppNotifications.controller");

router.get("/notifications", auth, controller.list);
router.get("/notifications/unseen-count", auth, controller.unseenCount);
router.patch("/notifications/:id/seen", auth, controller.markSeen);
router.patch("/notifications/seen-all", auth, controller.markAllSeen);
router.delete("/notifications/:id", auth, controller.remove);

module.exports = router;
