// src/modules/chats/chat.routes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middlewares/auth.middleware");
const chatController = require("./chat.controller");

router.use(authMiddleware);

// POST /chats/direct
router.post("/direct", chatController.startDirect);

// POST /chats/group
router.post("/group", chatController.createGroup);

// GET /chats
router.get("/", chatController.listChats);

// GET /chats/:chatId
router.get("/:chatId", chatController.getChat);

// GET /chats/:chatId/messages
router.get("/:chatId/messages", chatController.listMessages);

// PATCH /chats/:chatId/groupName (admin only in group)
router.patch("/:chatId/groupName", chatController.setGroupName);

// PATCH /chats/:chatId/members/add (admin/mod)
router.patch("/:chatId/members/add", chatController.addMembers);

// PATCH /chats/:chatId/members/remove (admin/mod)
router.patch("/:chatId/members/remove", chatController.removeMember);

module.exports = router;
