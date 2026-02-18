const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/admin.middleware");
const controller = require("./moderation.controller");

// Content report (any authenticated user)
router.post("/reports/content", authMiddleware, controller.createReport);

// Admin only
router.get("/admin/moderation/queue", authMiddleware, requireRole("admin"), controller.getModerationQueue);
router.get("/admin/moderation/videos", authMiddleware, requireRole("admin"), controller.adminListVideos);
router.get("/admin/moderation/streams", authMiddleware, requireRole("admin"), controller.adminListStreams);
router.patch("/admin/moderation/video/:id", authMiddleware, requireRole("admin"), controller.patchVideoModeration);
router.patch("/admin/moderation/videos/:id", authMiddleware, requireRole("admin"), controller.patchVideoModeration);
router.patch("/admin/moderation/stream/:id", authMiddleware, requireRole("admin"), controller.patchStreamModeration);
router.patch("/admin/moderation/streams/:id", authMiddleware, requireRole("admin"), controller.patchStreamModeration);

module.exports = router;
