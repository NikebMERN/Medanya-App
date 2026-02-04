// src/modules/chats/chat.service.js
const mongoose = require("mongoose");
const Chat = require("./chat.model");
const Message = require("./message.model");

const MAX_GROUP_SIZE = 200;
const MAX_LIMIT = 50;

function toIdString(id) {
    if (id === null || id === undefined) return "";
    return String(id);
}

function normalizePairKey(a, b) {
    const A = toIdString(a);
    const B = toIdString(b);
    if (!A || !B) return null;

    // Numeric compare if possible; otherwise lexicographic
    const aNum = Number(A);
    const bNum = Number(B);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return aNum < bNum ? `${A}:${B}` : `${B}:${A}`;
    }
    return A < B ? `${A}:${B}` : `${B}:${A}`;
}

function isParticipant(chat, userId) {
    const uid = toIdString(userId);
    return chat.participants.includes(uid);
}

function isGroupAdmin(chat, userId) {
    const uid = toIdString(userId);
    return (chat.admins || []).includes(uid);
}

function isGroupMod(chat, userId) {
    const uid = toIdString(userId);
    return (chat.moderators || []).includes(uid);
}

function canManageGroup(chat, userId) {
    return isGroupAdmin(chat, userId) || isGroupMod(chat, userId);
}

function encodeCursor(obj) {
    const json = JSON.stringify(obj);
    return Buffer.from(json, "utf8").toString("base64");
}

function decodeCursor(cursor) {
    try {
        const json = Buffer.from(cursor, "base64").toString("utf8");
        return JSON.parse(json);
    } catch {
        return null;
    }
}

async function startDirectChat(currentUserId, peerUserId) {
    const me = toIdString(currentUserId);
    const peer = toIdString(peerUserId);
    if (!me || !peer || me === peer) {
        const err = new Error("INVALID_PEER");
        err.code = "INVALID_PEER";
        throw err;
    }

    const directKey = normalizePairKey(me, peer);
    if (!directKey) {
        const err = new Error("INVALID_PEER");
        err.code = "INVALID_PEER";
        throw err;
    }

    // Try find existing first
    let chat = await Chat.findOne({ type: "direct", directKey }).lean();
    if (chat) return chat;

    // Create (handle race with unique index)
    try {
        const created = await Chat.create({
            type: "direct",
            participants: [me, peer],
            directKey,
            createdBy: me,
            lastMessageAt: new Date(),
            lastMessagePreview: "",
        });
        return created.toObject();
    } catch (e) {
        // If duplicate due to race, fetch existing
        if (e && e.code === 11000) {
            chat = await Chat.findOne({ type: "direct", directKey }).lean();
            if (chat) return chat;
        }
        const err = new Error("DB_ERROR");
        err.code = "DB_ERROR";
        throw err;
    }
}

async function createGroupChat(currentUserId, groupName, memberIds = []) {
    const me = toIdString(currentUserId);
    if (!me) {
        const err = new Error("FORBIDDEN");
        err.code = "FORBIDDEN";
        throw err;
    }

    const cleanName = String(groupName || "").trim();
    if (!cleanName || cleanName.length > 80) {
        const err = new Error("VALIDATION_ERROR");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const members = Array.isArray(memberIds)
        ? memberIds.map(toIdString).filter(Boolean)
        : [];
    // Ensure creator is included
    const uniq = new Set([me, ...members]);
    if (uniq.size < 2) {
        const err = new Error("VALIDATION_ERROR");
        err.code = "VALIDATION_ERROR";
        throw err;
    }
    if (uniq.size > MAX_GROUP_SIZE) {
        const err = new Error("GROUP_TOO_LARGE");
        err.code = "GROUP_TOO_LARGE";
        throw err;
    }

    const participants = Array.from(uniq);

    const created = await Chat.create({
        type: "group",
        participants,
        createdBy: me,
        groupName: cleanName,
        admins: [me],
        moderators: [],
        lastMessageAt: new Date(),
        lastMessagePreview: "",
    });

    return created.toObject();
}

async function getChatById(chatId) {
    if (!mongoose.isValidObjectId(chatId)) return null;
    return Chat.findById(chatId);
}

async function getChatLean(chatId) {
    if (!mongoose.isValidObjectId(chatId)) return null;
    return Chat.findById(chatId).lean();
}

async function listChats(currentUserId, { page = 1, limit = 20 } = {}) {
    const me = toIdString(currentUserId);
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
        Chat.find({ participants: me })
            .sort({ lastMessageAt: -1, updatedAt: -1 })
            .skip(skip)
            .limit(l)
            .lean(),
        Chat.countDocuments({ participants: me }),
    ]);

    return { page: p, limit: l, total, chats: items };
}

async function getChatMeta(currentUserId, chatId) {
    const me = toIdString(currentUserId);
    const chat = await getChatLean(chatId);
    if (!chat) {
        const err = new Error("INVALID_CHAT");
        err.code = "INVALID_CHAT";
        throw err;
    }
    if (!isParticipant(chat, me)) {
        const err = new Error("FORBIDDEN");
        err.code = "FORBIDDEN";
        throw err;
    }
    return chat;
}

async function addGroupMembers(currentUserId, chatId, memberIds = []) {
    const me = toIdString(currentUserId);
    const chat = await getChatById(chatId);
    if (!chat) {
        const err = new Error("INVALID_CHAT");
        err.code = "INVALID_CHAT";
        throw err;
    }
    if (chat.type !== "group") {
        const err = new Error("VALIDATION_ERROR");
        err.code = "VALIDATION_ERROR";
        throw err;
    }
    if (!canManageGroup(chat, me)) {
        const err = new Error("FORBIDDEN");
        err.code = "FORBIDDEN";
        throw err;
    }

    const addIds = Array.isArray(memberIds)
        ? memberIds.map(toIdString).filter(Boolean)
        : [];
    const before = new Set(chat.participants);

    for (const id of addIds) before.add(id);

    if (before.size > MAX_GROUP_SIZE) {
        const err = new Error("GROUP_TOO_LARGE");
        err.code = "GROUP_TOO_LARGE";
        throw err;
    }

    chat.participants = Array.from(before);
    await chat.save();
    return true;
}

async function removeGroupMember(currentUserId, chatId, memberId) {
    const me = toIdString(currentUserId);
    const target = toIdString(memberId);

    const chat = await getChatById(chatId);
    if (!chat) {
        const err = new Error("INVALID_CHAT");
        err.code = "INVALID_CHAT";
        throw err;
    }
    if (chat.type !== "group") {
        const err = new Error("VALIDATION_ERROR");
        err.code = "VALIDATION_ERROR";
        throw err;
    }
    if (!canManageGroup(chat, me)) {
        const err = new Error("FORBIDDEN");
        err.code = "FORBIDDEN";
        throw err;
    }
    if (!target) {
        const err = new Error("VALIDATION_ERROR");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    // Prevent removing last admin if target is admin
    const admins = new Set(chat.admins || []);
    if (admins.has(target) && admins.size <= 1) {
        const err = new Error("LAST_ADMIN_BLOCKED");
        err.code = "LAST_ADMIN_BLOCKED";
        throw err;
    }

    // Remove from participants
    chat.participants = (chat.participants || []).filter((id) => id !== target);

    // If removed user was admin/mod, remove from roles too
    chat.admins = (chat.admins || []).filter((id) => id !== target);
    chat.moderators = (chat.moderators || []).filter((id) => id !== target);

    await chat.save();
    return true;
}

async function setGroupName(currentUserId, chatId, groupName) {
    const me = toIdString(currentUserId);
    const chat = await getChatById(chatId);
    if (!chat) {
        const err = new Error("INVALID_CHAT");
        err.code = "INVALID_CHAT";
        throw err;
    }
    if (chat.type !== "group") {
        const err = new Error("VALIDATION_ERROR");
        err.code = "VALIDATION_ERROR";
        throw err;
    }
    if (!isGroupAdmin(chat, me)) {
        const err = new Error("FORBIDDEN");
        err.code = "FORBIDDEN";
        throw err;
    }
    const cleanName = String(groupName || "").trim();
    if (!cleanName || cleanName.length > 80) {
        const err = new Error("VALIDATION_ERROR");
        err.code = "VALIDATION_ERROR";
        throw err;
    }
    chat.groupName = cleanName;
    await chat.save();
    return true;
}

async function sendMessage(
    currentUserId,
    { chatId, type, text = "", mediaUrl = "" },
) {
    const me = toIdString(currentUserId);
    const chat = await getChatById(chatId);
    if (!chat) {
        const err = new Error("INVALID_CHAT");
        err.code = "INVALID_CHAT";
        throw err;
    }
    if (!isParticipant(chat, me)) {
        const err = new Error("FORBIDDEN");
        err.code = "FORBIDDEN";
        throw err;
    }

    const msgType = String(type || "");
    if (!["text", "image", "video", "voice"].includes(msgType)) {
        const err = new Error("VALIDATION_ERROR");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const bodyText = String(text || "");
    const bodyUrl = String(mediaUrl || "");

    if (msgType === "text" && !bodyText.trim()) {
        const err = new Error("VALIDATION_ERROR");
        err.code = "VALIDATION_ERROR";
        throw err;
    }
    if (msgType !== "text" && !bodyUrl.trim()) {
        const err = new Error("VALIDATION_ERROR");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const createdAt = new Date();

    const message = await Message.create({
        chatId: chat._id,
        senderId: me,
        type: msgType,
        text: msgType === "text" ? bodyText : "",
        mediaUrl: msgType === "text" ? "" : bodyUrl,
        deliveredAt: createdAt,
        readBy: [{ userId: me, readAt: createdAt }],
        readByUserIds: [me],
    });

    // Update chat metadata
    chat.lastMessageAt = createdAt;
    chat.lastMessagePreview =
        msgType === "text"
            ? bodyText.slice(0, 80)
            : msgType === "image"
                ? "📷 Image"
                : msgType === "video"
                    ? "🎥 Video"
                    : "🎙️ Voice";
    await chat.save();

    return message.toObject();
}

async function listMessages(currentUserId, { chatId, cursor, limit }) {
    const me = toIdString(currentUserId);
    const chat = await getChatLean(chatId);
    if (!chat) {
        const err = new Error("INVALID_CHAT");
        err.code = "INVALID_CHAT";
        throw err;
    }
    if (!isParticipant(chat, me)) {
        const err = new Error("FORBIDDEN");
        err.code = "FORBIDDEN";
        throw err;
    }

    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), MAX_LIMIT);

    const decoded = cursor ? decodeCursor(cursor) : null;

    const query = { chatId: chat._id };

    // cursor pagination: createdAt desc, _id desc
    if (decoded && decoded.createdAt && decoded.id) {
        query.$or = [
            { createdAt: { $lt: new Date(decoded.createdAt) } },
            { createdAt: new Date(decoded.createdAt), _id: { $lt: decoded.id } },
        ];
    }

    const messages = await Message.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .limit(l + 1)
        .lean();

    let nextCursor = null;
    let items = messages;

    if (messages.length > l) {
        items = messages.slice(0, l);
        const last = items[items.length - 1];
        nextCursor = encodeCursor({
            createdAt: last.createdAt,
            id: String(last._id),
        });
    }

    // Return in chronological order for UI convenience
    items.reverse();

    return { messages: items, nextCursor };
}

async function markMessagesRead(currentUserId, { chatId, messageIds = [] }) {
    const me = toIdString(currentUserId);
    const chat = await getChatLean(chatId);
    if (!chat) {
        const err = new Error("INVALID_CHAT");
        err.code = "INVALID_CHAT";
        throw err;
    }
    if (!isParticipant(chat, me)) {
        const err = new Error("FORBIDDEN");
        err.code = "FORBIDDEN";
        throw err;
    }

    const ids = Array.isArray(messageIds)
        ? messageIds.filter((x) => mongoose.isValidObjectId(x))
        : [];
    if (ids.length === 0) {
        const err = new Error("VALIDATION_ERROR");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const now = new Date();

    // 1) add userId into readByUserIds (unique)
    await Message.updateMany(
        { chatId: chat._id, _id: { $in: ids } },
        { $addToSet: { readByUserIds: me } },
    );

    // 2) add readBy entry only where it doesn't already contain userId
    //    This keeps readBy aligned with readByUserIds.
    await Message.updateMany(
        {
            chatId: chat._id,
            _id: { $in: ids },
            readByUserIds: me,
            "readBy.userId": { $ne: me },
        },
        { $push: { readBy: { userId: me, readAt: now } } },
    );

    return true;
}

module.exports = {
    MAX_GROUP_SIZE,
    startDirectChat,
    createGroupChat,
    listChats,
    getChatMeta,
    addGroupMembers,
    removeGroupMember,
    setGroupName,
    sendMessage,
    listMessages,
    markMessagesRead,
};
