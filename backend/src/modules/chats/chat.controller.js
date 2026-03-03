// src/modules/chats/chat.controller.js
const chatService = require("./chat.service");
const logger = require("../../utils/logger.util");

function mapError(res, err) {
    const code = err.code || "SERVER_ERROR";
    const status =
        code === "FORBIDDEN"
            ? 403
            : code === "INVALID_CHAT"
                ? 404
                : code === "INVALID_PEER"
                    ? 400
                    : code === "VALIDATION_ERROR"
                        ? 400
                        : code === "GROUP_TOO_LARGE"
                            ? 400
                            :                         code === "LAST_ADMIN_BLOCKED"
                                ? 409
                                : code === "INVALID_MESSAGE"
                                    ? 404
                                    : 500;

    return res.status(status).json({
        error: { code, message: err.message || code },
    });
}

const startDirect = async (req, res) => {
    try {
        const me = req.user.id ?? req.user.userId;
        const { peerUserId } = req.body;
        const chat = await chatService.startDirectChat(me, peerUserId);
        return res.json({ success: true, chat });
    } catch (err) {
        return mapError(res, err);
    }
};

const createGroup = async (req, res) => {
    try {
        const me = req.user.id ?? req.user.userId;
        const { groupName, memberIds, isChannel } = req.body;
        const chat = await chatService.createGroupChat(me, groupName, memberIds, isChannel);
        return res.json({ success: true, chat });
    } catch (err) {
        return mapError(res, err);
    }
};

const listChats = async (req, res) => {
    try {
        const me = req.user.id ?? req.user.userId;
        const { page, limit } = req.query;
        const data = await chatService.listChats(me, { page, limit });
        return res.json({ success: true, ...data });
    } catch (err) {
        return mapError(res, err);
    }
};

const searchGroups = async (req, res) => {
    try {
        const me = req.user.id ?? req.user.userId;
        const { q, id } = req.query;
        const data = await chatService.searchGroups(me, { q: q || undefined, id: id || undefined });
        return res.json({ success: true, ...data });
    } catch (err) {
        return mapError(res, err);
    }
};

const joinGroup = async (req, res) => {
    try {
        const me = req.user.id ?? req.user.userId;
        const { chatId } = req.params;
        const chat = await chatService.joinGroup(me, chatId);
        return res.json({ success: true, chat });
    } catch (err) {
        return mapError(res, err);
    }
};

const getChat = async (req, res) => {
    try {
        const me = req.user.id ?? req.user.userId;
        const { chatId } = req.params;
        const chat = await chatService.getChatMeta(me, chatId);
        return res.json({ success: true, chat });
    } catch (err) {
        return mapError(res, err);
    }
};

const markRead = async (req, res) => {
    try {
        const me = req.user.id ?? req.user.userId;
        const { chatId } = req.params;
        const { messageId } = req.body || {};
        await chatService.markReadUpTo(me, chatId, messageId);
        return res.json({ success: true });
    } catch (err) {
        return mapError(res, err);
    }
};

const listMessages = async (req, res) => {
    try {
        const me = req.user.id ?? req.user.userId;
        const { chatId } = req.params;
        const { cursor, limit } = req.query;
        const data = await chatService.listMessages(me, { chatId, cursor, limit });
        return res.json({ success: true, ...data });
    } catch (err) {
        return mapError(res, err);
    }
};

const setGroupName = async (req, res) => {
    try {
        const me = req.user.id ?? req.user.userId;
        const { chatId } = req.params;
        const { groupName } = req.body;
        await chatService.setGroupName(me, chatId, groupName);
        return res.json({ success: true });
    } catch (err) {
        return mapError(res, err);
    }
};

const setGroupAvatar = async (req, res) => {
    try {
        const me = req.user.id ?? req.user.userId;
        const { chatId } = req.params;
        const { groupAvatarUrl } = req.body;
        await chatService.setGroupAvatar(me, chatId, groupAvatarUrl);
        return res.json({ success: true });
    } catch (err) {
        return mapError(res, err);
    }
};

const setGroupPermissions = async (req, res) => {
    try {
        const me = req.user.id ?? req.user.userId;
        const { chatId } = req.params;
        const { membersCanEditProfile, membersCanSendMessages, membersCanEditChannel } = req.body;
        await chatService.setGroupPermissions(me, chatId, {
            membersCanEditProfile,
            membersCanSendMessages,
            membersCanEditChannel,
        });
        return res.json({ success: true });
    } catch (err) {
        return mapError(res, err);
    }
};

const addMembers = async (req, res) => {
    try {
        const me = req.user.id ?? req.user.userId;
        const { chatId } = req.params;
        const { memberIds } = req.body;
        await chatService.addGroupMembers(me, chatId, memberIds);
        return res.json({ success: true });
    } catch (err) {
        return mapError(res, err);
    }
};

const removeMember = async (req, res) => {
    try {
        const me = req.user.id ?? req.user.userId;
        const { chatId } = req.params;
        const { memberId } = req.body;
        await chatService.removeGroupMember(me, chatId, memberId);
        return res.json({ success: true });
    } catch (err) {
        return mapError(res, err);
    }
};

const leaveGroup = async (req, res) => {
    try {
        const me = req.user.id ?? req.user.userId;
        const { chatId } = req.params;
        await chatService.leaveGroup(me, chatId);
        return res.json({ success: true });
    } catch (err) {
        return mapError(res, err);
    }
};

const deleteGroup = async (req, res) => {
    try {
        const me = req.user.id ?? req.user.userId;
        const { chatId } = req.params;
        await chatService.deleteGroup(me, chatId);
        return res.json({ success: true });
    } catch (err) {
        return mapError(res, err);
    }
};

const deleteMessageForAll = async (req, res) => {
    try {
        const me = req.user.id ?? req.user.userId;
        const { chatId, messageId } = req.params;
        await chatService.deleteMessageForAll(me, chatId, messageId);
        return res.json({ success: true });
    } catch (err) {
        return mapError(res, err);
    }
};

const deleteMessageForMe = async (req, res) => {
    try {
        const me = req.user.id ?? req.user.userId;
        const { chatId, messageId } = req.params;
        await chatService.deleteMessageForMe(me, chatId, messageId);
        return res.json({ success: true });
    } catch (err) {
        return mapError(res, err);
    }
};

const votePoll = async (req, res) => {
    try {
        const me = req.user.id ?? req.user.userId;
        const { chatId, messageId } = req.params;
        const { optionIndex } = req.body;
        const data = await chatService.votePoll(me, chatId, messageId, optionIndex);
        return res.json({ success: true, ...data });
    } catch (err) {
        return mapError(res, err);
    }
};

module.exports = {
    startDirect,
    createGroup,
    listChats,
    markRead,
    searchGroups,
    joinGroup,
    getChat,
    listMessages,
    setGroupName,
    setGroupAvatar,
    setGroupPermissions,
    addMembers,
    removeMember,
    leaveGroup,
    deleteGroup,
    deleteMessageForAll,
    deleteMessageForMe,
    votePoll,
};
