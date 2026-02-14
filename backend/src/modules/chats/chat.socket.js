// src/modules/chats/chat.socket.js
const mongoose = require("mongoose");
const chatService = require("./chat.service");
const logger = require("../../utils/logger.util");
const Chat = require("./chat.model");

function chatRoom(chatId) {
    return `chat:${chatId}`;
}

function ackErr(ack, error) {
    return ack({ ok: false, error });
}

function ackOk(ack, payload = {}) {
    return ack({ ok: true, ...payload });
}

function safeId(x) {
    return x === null || x === undefined ? "" : String(x);
}

function validateChatId(chatId) {
    return mongoose.isValidObjectId(chatId);
}

async function ensureParticipantAndJoin(socket, chatId) {
    const me = safeId(socket.user.id);
    const chat = await Chat.findById(chatId).lean();
    if (!chat) return { ok: false, error: "INVALID_CHAT" };
    if (!chat.participants.includes(me)) return { ok: false, error: "FORBIDDEN" };

    socket.join(chatRoom(chatId));
    return { ok: true, chat };
}

module.exports = function registerChatSocket(io, socket) {
    const me = safeId(socket.user.id);

    // 1) direct start
    socket.on("chat:direct:start", async (payload = {}, ack = () => { }) => {
        try {
            const peerUserId = safeId(payload.peerUserId);
            const chat = await chatService.startDirectChat(me, peerUserId);

            // join room
            socket.join(chatRoom(chat._id));

            return ackOk(ack, { chatId: String(chat._id) });
        } catch (e) {
            const code = e.code || "SERVER_ERROR";
            if (code === "INVALID_PEER") return ackErr(ack, "INVALID_PEER");
            return ackErr(ack, "SERVER_ERROR");
        }
    });

    // 2) group create
    socket.on("chat:group:create", async (payload = {}, ack = () => { }) => {
        try {
            const groupName = payload.groupName;
            const memberIds = Array.isArray(payload.memberIds)
                ? payload.memberIds
                : [];

            const chat = await chatService.createGroupChat(me, groupName, memberIds);

            socket.join(chatRoom(chat._id));
            return ackOk(ack, { chatId: String(chat._id) });
        } catch (e) {
            const code = e.code || "SERVER_ERROR";
            if (code === "GROUP_TOO_LARGE") return ackErr(ack, "GROUP_TOO_LARGE");
            if (code === "VALIDATION_ERROR") return ackErr(ack, "VALIDATION_ERROR");
            return ackErr(ack, "SERVER_ERROR");
        }
    });

    // 3) add members
    socket.on("chat:group:addMembers", async (payload = {}, ack = () => { }) => {
        try {
            const chatId = safeId(payload.chatId);
            const memberIds = Array.isArray(payload.memberIds)
                ? payload.memberIds
                : [];
            if (!validateChatId(chatId)) return ackErr(ack, "INVALID_CHAT");

            // Ensure participant before allowing admin/mod actions
            const check = await ensureParticipantAndJoin(socket, chatId);
            if (!check.ok) return ackErr(ack, check.error);

            await chatService.addGroupMembers(me, chatId, memberIds);
            return ackOk(ack);
        } catch (e) {
            const code = e.code || "SERVER_ERROR";
            if (code === "FORBIDDEN") return ackErr(ack, "FORBIDDEN");
            if (code === "GROUP_TOO_LARGE") return ackErr(ack, "GROUP_TOO_LARGE");
            if (code === "VALIDATION_ERROR") return ackErr(ack, "VALIDATION_ERROR");
            return ackErr(ack, "SERVER_ERROR");
        }
    });

    // 4) remove member
    socket.on("chat:group:removeMember", async (payload = {}, ack = () => { }) => {
        try {
            const chatId = safeId(payload.chatId);
            const memberId = safeId(payload.memberId);
            if (!validateChatId(chatId)) return ackErr(ack, "INVALID_CHAT");
            if (!memberId) return ackErr(ack, "VALIDATION_ERROR");

            const check = await ensureParticipantAndJoin(socket, chatId);
            if (!check.ok) return ackErr(ack, check.error);

            await chatService.removeGroupMember(me, chatId, memberId);
            return ackOk(ack);
        } catch (e) {
            const code = e.code || "SERVER_ERROR";
            if (code === "FORBIDDEN") return ackErr(ack, "FORBIDDEN");
            if (code === "LAST_ADMIN_BLOCKED")
                return ackErr(ack, "LAST_ADMIN_BLOCKED");
            if (code === "VALIDATION_ERROR") return ackErr(ack, "VALIDATION_ERROR");
            return ackErr(ack, "SERVER_ERROR");
        }
    });

    // 5) send message
    socket.on("chat:message:send", async (payload = {}, ack = () => { }) => {
        try {
            const chatId = safeId(payload.chatId);
            if (!validateChatId(chatId)) return ackErr(ack, "INVALID_CHAT");

            const check = await ensureParticipantAndJoin(socket, chatId);
            if (!check.ok) return ackErr(ack, check.error);

            const message = await chatService.sendMessage(me, {
                chatId,
                type: payload.type,
                text: payload.text,
                mediaUrl: payload.mediaUrl,
            });

            // Emit to chat room
            io.to(chatRoom(chatId)).emit("chat:message:new", message);

            return ackOk(ack, {
                messageId: String(message._id),
                createdAt: message.createdAt,
            });
        } catch (e) {
            const code = e.code || "SERVER_ERROR";
            if (code === "INVALID_CHAT") return ackErr(ack, "INVALID_CHAT");
            if (code === "FORBIDDEN") return ackErr(ack, "FORBIDDEN");
            if (code === "VALIDATION_ERROR") return ackErr(ack, "VALIDATION_ERROR");
            logger.error("chat:message:send error", e);
            return ackErr(ack, "SERVER_ERROR");
        }
    });

    // 6) list messages
    socket.on("chat:message:list", async (payload = {}, ack = () => { }) => {
        try {
            const chatId = safeId(payload.chatId);
            if (!validateChatId(chatId)) return ackErr(ack, "INVALID_CHAT");

            const check = await ensureParticipantAndJoin(socket, chatId);
            if (!check.ok) return ackErr(ack, check.error);

            const limit = payload.limit;
            const cursor = payload.cursor;

            const data = await chatService.listMessages(me, {
                chatId,
                cursor,
                limit,
            });
            return ackOk(ack, {
                messages: data.messages,
                nextCursor: data.nextCursor || null,
            });
        } catch (e) {
            const code = e.code || "SERVER_ERROR";
            if (code === "INVALID_CHAT") return ackErr(ack, "INVALID_CHAT");
            if (code === "FORBIDDEN") return ackErr(ack, "FORBIDDEN");
            return ackErr(ack, "SERVER_ERROR");
        }
    });

    // 7) typing
    socket.on("chat:typing", async (payload = {}, ack = () => { }) => {
        try {
            const chatId = safeId(payload.chatId);
            const isTyping = !!payload.isTyping;
            if (!validateChatId(chatId)) return ackErr(ack, "INVALID_CHAT");

            const check = await ensureParticipantAndJoin(socket, chatId);
            if (!check.ok) return ackErr(ack, check.error);

            socket.to(chatRoom(chatId)).emit("chat:typing", {
                chatId,
                userId: me,
                isTyping,
            });

            return ackOk(ack);
        } catch {
            return ackErr(ack, "SERVER_ERROR");
        }
    });

    // 8) read receipts
    socket.on("chat:message:read", async (payload = {}, ack = () => { }) => {
        try {
            const chatId = safeId(payload.chatId);
            const messageIds = Array.isArray(payload.messageIds)
                ? payload.messageIds
                : [];
            if (!validateChatId(chatId)) return ackErr(ack, "INVALID_CHAT");

            const check = await ensureParticipantAndJoin(socket, chatId);
            if (!check.ok) return ackErr(ack, check.error);

            await chatService.markMessagesRead(me, { chatId, messageIds });
            if (Array.isArray(messageIds) && messageIds.length > 0) {
                io.to(chatRoom(chatId)).emit("chat:message:read-receipt", { messageIds, readByUserId: me });
            }
            return ackOk(ack);
        } catch (e) {
            const code = e.code || "SERVER_ERROR";
            if (code === "VALIDATION_ERROR") return ackErr(ack, "VALIDATION_ERROR");
            if (code === "FORBIDDEN") return ackErr(ack, "FORBIDDEN");
            return ackErr(ack, "SERVER_ERROR");
        }
    });
};
