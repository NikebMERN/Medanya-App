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

// GET /chats/search?q=name or ?id=chatId (must be before /:chatId)
router.get("/search", chatController.searchGroups);

// POST /chats/:chatId/join (join a group by id)
router.post("/:chatId/join", chatController.joinGroup);

// GET /chats/:chatId
router.get("/:chatId", chatController.getChat);

// GET /chats/:chatId/messages
router.get("/:chatId/messages", chatController.listMessages);

// DELETE /chats/:chatId/messages/:messageId (delete for everyone; sender or admin)
router.delete("/:chatId/messages/:messageId", chatController.deleteMessageForAll);

// PATCH /chats/:chatId/messages/:messageId/hide (delete for me only)
router.patch("/:chatId/messages/:messageId/hide", chatController.deleteMessageForMe);

// POST /chats/:chatId/messages/:messageId/vote (vote on poll, body: { optionIndex: number })
router.post("/:chatId/messages/:messageId/vote", chatController.votePoll);

// PATCH /chats/:chatId/groupName (admin or member if permission granted)
router.patch("/:chatId/groupName", chatController.setGroupName);

// PATCH /chats/:chatId/groupAvatar (admin or member if permission granted)
router.patch("/:chatId/groupAvatar", chatController.setGroupAvatar);

// PATCH /chats/:chatId/permissions (owner/admin only)
router.patch("/:chatId/permissions", chatController.setGroupPermissions);

// PATCH /chats/:chatId/members/add (admin/mod)
router.patch("/:chatId/members/add", chatController.addMembers);

// PATCH /chats/:chatId/members/remove (admin/mod)
router.patch("/:chatId/members/remove", chatController.removeMember);

// POST /chats/:chatId/leave (member leaves group/channel)
router.post("/:chatId/leave", chatController.leaveGroup);

// DELETE /chats/:chatId (owner only - deletes group/channel)
router.delete("/:chatId", chatController.deleteGroup);

module.exports = router;
