// src/modules/communityRooms/room.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/admin.middleware");
const controller = require("./room.controller");

router.get("/rooms/posts", controller.listPosts);
router.get("/rooms/posts/:id", controller.getPost);
router.get("/rooms/posts/:id/comments", controller.listComments);

router.post("/rooms/posts", auth, controller.createPost);
router.post("/rooms/posts/:id/comments", auth, controller.addComment);
router.post("/rooms/posts/:id/report", auth, controller.reportPost);

router.get("/admin/rooms/posts", auth, requireRole("admin"), controller.adminListPosts);
router.patch("/admin/rooms/posts/:id/moderate", auth, requireRole("admin"), controller.adminModeratePost);

module.exports = router;
