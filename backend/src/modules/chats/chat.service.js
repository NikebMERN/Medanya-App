// src/modules/chats/chat.service.js
const mongoose = require("mongoose");
const Chat = require("./chat.model");
const Message = require("./message.model");
const followDb = require("../users/follow.mysql");

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

function canEditGroupProfile(chat, userId) {
    const uid = toIdString(userId);
    if (isGroupAdmin(chat, uid) || isGroupMod(chat, uid)) return true;
    if (chat.isChannel) return !!(chat.membersCanEditChannel);
    return !!(chat.membersCanEditProfile);
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

async function createGroupChat(currentUserId, groupName, memberIds = [], isChannel = false) {
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
        isChannel: !!isChannel,
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

    let blockedIds = [];
    try {
        blockedIds = await followDb.getBlockedUserIds(me);
    } catch (_) {
        // ignore if user_blocks table missing or MySQL unavailable
    }
    const blockedSet = new Set(blockedIds.map((id) => String(id)));

    const [items, total] = await Promise.all([
        Chat.find({ participants: me })
            .sort({ lastMessageAt: -1, updatedAt: -1 })
            .skip(skip)
            .limit(l)
            .lean(),
        Chat.countDocuments({ participants: me }),
    ]);

    const filtered = items.filter((chat) => {
        if (chat.type !== "direct") return true;
        const other = (chat.participants || []).find((pid) => String(pid) !== me);
        return !other || !blockedSet.has(String(other));
    });

    return { page: p, limit: l, total, chats: filtered };
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

async function leaveGroup(currentUserId, chatId) {
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
    if (!isParticipant(chat, me)) {
        const err = new Error("FORBIDDEN");
        err.code = "FORBIDDEN";
        throw err;
    }
    chat.participants = (chat.participants || []).filter((id) => id !== me);
    chat.admins = (chat.admins || []).filter((id) => id !== me);
    chat.moderators = (chat.moderators || []).filter((id) => id !== me);
    await chat.save();
    return true;
}

async function deleteGroup(currentUserId, chatId) {
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
    const createdBy = toIdString(chat.createdBy);
    if (createdBy !== me) {
        const err = new Error("FORBIDDEN");
        err.code = "FORBIDDEN";
        err.message = "Only the group owner can delete the group";
        throw err;
    }
    await Message.deleteMany({ chatId: chat._id });
    await Chat.deleteOne({ _id: chat._id });
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
    if (!isParticipant(chat, me)) {
        const err = new Error("FORBIDDEN");
        err.code = "FORBIDDEN";
        throw err;
    }
    if (!canEditGroupProfile(chat, me)) {
        const err = new Error("FORBIDDEN");
        err.code = "FORBIDDEN";
        err.message = "You don't have permission to edit the name";
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

async function setGroupAvatar(currentUserId, chatId, avatarUrl) {
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
    if (!isParticipant(chat, me)) {
        const err = new Error("FORBIDDEN");
        err.code = "FORBIDDEN";
        throw err;
    }
    if (!canEditGroupProfile(chat, me)) {
        const err = new Error("FORBIDDEN");
        err.code = "FORBIDDEN";
        err.message = "You don't have permission to change the group photo";
        throw err;
    }
    chat.groupAvatarUrl = String(avatarUrl || "").trim();
    await chat.save();
    return true;
}

async function setGroupPermissions(currentUserId, chatId, payload) {
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
    if (toIdString(chat.createdBy) !== me && !isGroupAdmin(chat, me)) {
        const err = new Error("FORBIDDEN");
        err.code = "FORBIDDEN";
        err.message = "Only the owner or admin can change permissions";
        throw err;
    }
    if (payload.membersCanEditProfile !== undefined) chat.membersCanEditProfile = !!payload.membersCanEditProfile;
    if (payload.membersCanSendMessages !== undefined) chat.membersCanSendMessages = !!payload.membersCanSendMessages;
    if (payload.membersCanEditChannel !== undefined) chat.membersCanEditChannel = !!payload.membersCanEditChannel;
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
    if (chat.isChannel && !isGroupAdmin(chat, me) && !chat.membersCanSendMessages) {
        const err = new Error("FORBIDDEN");
        err.code = "FORBIDDEN";
        err.message = "Only the channel owner can send messages";
        throw err;
    }

    const msgType = String(type || "");
    if (!["text", "image", "video", "voice", "file", "location", "poll", "contact", "profile"].includes(msgType)) {
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
    const needsMedia = ["image", "video", "voice", "file"].includes(msgType);
    const needsText = ["location", "poll", "contact", "profile"].includes(msgType);
    if (needsMedia && !bodyUrl.trim()) {
        const err = new Error("VALIDATION_ERROR");
        err.code = "VALIDATION_ERROR";
        throw err;
    }
    if (needsText && !bodyText.trim()) {
        const err = new Error("VALIDATION_ERROR");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const createdAt = new Date();

    const message = await Message.create({
        chatId: chat._id,
        senderId: me,
        type: msgType,
        text: ["text", "location", "poll", "contact", "profile"].includes(msgType) ? bodyText : "",
        mediaUrl: needsMedia ? bodyUrl : "",
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
                    : msgType === "voice"
                        ? "🎙️ Voice"
                        : msgType === "file"
                            ? "📎 File"
                            : msgType === "location"
                                ? "📍 Location"
                                : msgType === "poll"
                                    ? "📊 Poll"
                                    : msgType === "contact"
                                        ? "👤 Contact"
                                        : msgType === "profile"
                                            ? "👤 Profile"
                                            : "Message";
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
    query.deletedForUserIds = { $ne: me };

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

    // Enrich poll messages with vote counts and current user's vote
    const enriched = items.map((m) => {
        if (m.type !== "poll" || !m.pollVotes) return m;
        let options = [];
        try {
            const parsed = JSON.parse(m.text || "{}");
            options = Array.isArray(parsed.options) ? parsed.options : [];
        } catch (_) {}
        const votes = m.pollVotes || [];
        const optionCounts = options.map((_, idx) => votes.filter((v) => v.optionIndex === idx).length);
        const totalVotes = optionCounts.reduce((s, c) => s + c, 0);
        const myVote = votes.find((v) => String(v.userId) === me);
        return {
            ...m,
            pollOptionCounts: optionCounts,
            pollTotalVotes: totalVotes,
            pollUserVote: myVote ? myVote.optionIndex : null,
        };
    });

    return { messages: enriched, nextCursor };
}

async function deleteMessageForAll(currentUserId, chatId, messageId) {
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
    const msg = await Message.findOne({ _id: messageId, chatId: chat._id }).lean();
    if (!msg) {
        const err = new Error("INVALID_MESSAGE");
        err.code = "INVALID_MESSAGE";
        throw err;
    }
    const isSender = toIdString(msg.senderId) === me;
    const canDelete = isSender || (chat.type === "group" && isGroupAdmin(chat, me));
    if (!canDelete) {
        const err = new Error("FORBIDDEN");
        err.code = "FORBIDDEN";
        err.message = "Only the sender or group admin can delete for everyone";
        throw err;
    }
    await Message.deleteOne({ _id: messageId, chatId: chat._id });

    // Update chat's last message preview to the new latest message (or clear)
    const nextMsg = await Message.findOne({ chatId: chat._id, deletedForUserIds: { $ne: me } })
        .sort({ createdAt: -1, _id: -1 })
        .lean();
    if (nextMsg) {
        const preview =
            nextMsg.type === "text"
                ? (nextMsg.text || "").slice(0, 80)
                : nextMsg.type === "image"
                    ? "📷 Image"
                    : nextMsg.type === "video"
                        ? "🎥 Video"
                        : nextMsg.type === "voice"
                            ? "🎙️ Voice"
                            : nextMsg.type === "file"
                                ? "📎 File"
                                : nextMsg.type === "location"
                                    ? "📍 Location"
                                    : nextMsg.type === "poll"
                                        ? "📊 Poll"
                                        : nextMsg.type === "contact"
                                            ? "👤 Contact"
                                            : nextMsg.type === "profile"
                                                ? "👤 Profile"
                                                : "Message";
        await Chat.updateOne(
            { _id: chat._id },
            { $set: { lastMessageAt: nextMsg.createdAt, lastMessagePreview: preview } }
        );
    } else {
        await Chat.updateOne(
            { _id: chat._id },
            { $set: { lastMessageAt: null, lastMessagePreview: "" } }
        );
    }
    return true;
}

async function deleteMessageForMe(currentUserId, chatId, messageId) {
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
    const msg = await Message.findOne({ _id: messageId, chatId: chat._id });
    if (!msg) {
        const err = new Error("INVALID_MESSAGE");
        err.code = "INVALID_MESSAGE";
        throw err;
    }
    const deletedFor = msg.deletedForUserIds || [];
    if (deletedFor.includes(me)) return true;
    msg.deletedForUserIds = [...deletedFor, me];
    await msg.save();
    return true;
}

async function votePoll(currentUserId, chatId, messageId, optionIndex) {
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
    const msg = await Message.findOne({ _id: messageId, chatId: chat._id });
    if (!msg) {
        const err = new Error("INVALID_MESSAGE");
        err.code = "INVALID_MESSAGE";
        throw err;
    }
    if (msg.type !== "poll") {
        const err = new Error("VALIDATION_ERROR");
        err.code = "VALIDATION_ERROR";
        err.message = "Message is not a poll";
        throw err;
    }
    let options = [];
    try {
        const parsed = JSON.parse(msg.text || "{}");
        options = Array.isArray(parsed.options) ? parsed.options : [];
    } catch (_) {}
    const idx = parseInt(optionIndex, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= options.length) {
        const err = new Error("VALIDATION_ERROR");
        err.code = "VALIDATION_ERROR";
        err.message = "Invalid option index";
        throw err;
    }
    const votes = (msg.pollVotes || []).filter((v) => String(v.userId) !== me);
    votes.push({ userId: me, optionIndex: idx });
    msg.pollVotes = votes;
    await msg.save();
    const optionCounts = options.map((_, i) => votes.filter((v) => v.optionIndex === i).length);
    const totalVotes = optionCounts.reduce((s, c) => s + c, 0);
    return {
        pollOptionCounts: optionCounts,
        pollTotalVotes: totalVotes,
        pollUserVote: idx,
    };
}

const SEARCH_GROUPS_LIMIT = 30;

async function searchGroups(currentUserId, { q, id } = {}) {
    const me = toIdString(currentUserId);
    if (!me) {
        const err = new Error("FORBIDDEN");
        err.code = "FORBIDDEN";
        throw err;
    }
    if (id) {
        const chat = await getChatLean(id);
        if (!chat || chat.type !== "group") return { groups: [] };
        const participantCount = (chat.participants || []).length;
        const isMember = chat.participants.includes(me);
        return {
            groups: [
                {
                    _id: chat._id,
                    id: String(chat._id),
                    groupName: chat.groupName || "Group",
                    participantCount,
                    isMember,
                },
            ],
        };
    }
    const searchStr = (q && String(q).trim()) || "";
    if (!searchStr || searchStr.length < 2) return { groups: [] };
    const regex = new RegExp(searchStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const items = await Chat.find({
        type: "group",
        groupName: regex,
    })
        .sort({ lastMessageAt: -1 })
        .limit(SEARCH_GROUPS_LIMIT)
        .lean();
    const groups = items.map((c) => {
        const participantCount = (c.participants || []).length;
        const isMember = (c.participants || []).includes(me);
        return {
            _id: c._id,
            id: String(c._id),
            groupName: c.groupName || "Group",
            participantCount,
            isMember,
        };
    });
    return { groups };
}

async function joinGroup(currentUserId, chatId) {
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
        err.message = "Not a group chat";
        throw err;
    }
    if (isParticipant(chat, me)) {
        return chat.toObject ? chat.toObject() : chat;
    }
    const participants = [...(chat.participants || []), me];
    if (participants.length > MAX_GROUP_SIZE) {
        const err = new Error("GROUP_TOO_LARGE");
        err.code = "GROUP_TOO_LARGE";
        throw err;
    }
    chat.participants = participants;
    await chat.save();
    return chat.toObject ? chat.toObject() : chat;
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

async function getMessagesBetweenUsersForAdmin(userIdA, userIdB, limit = 100) {
    const A = toIdString(userIdA);
    const B = toIdString(userIdB);
    if (!A || !B || A === B) return [];
    const directKey = normalizePairKey(A, B);
    if (!directKey) return [];
    const chat = await Chat.findOne({ type: "direct", directKey }).lean();
    if (!chat) return [];
    const messages = await Message.find({ chatId: chat._id })
        .sort({ createdAt: 1 })
        .limit(limit)
        .lean();
    return messages.map((m) => ({
        _id: m._id,
        senderId: m.senderId,
        type: m.type,
        text: m.text,
        mediaUrl: m.mediaUrl,
        createdAt: m.createdAt,
    }));
}

module.exports = {
    MAX_GROUP_SIZE,
    startDirectChat,
    getMessagesBetweenUsersForAdmin,
    createGroupChat,
    listChats,
    getChatMeta,
    searchGroups,
    joinGroup,
    addGroupMembers,
    removeGroupMember,
    leaveGroup,
    deleteGroup,
    setGroupName,
    setGroupAvatar,
    setGroupPermissions,
    sendMessage,
    listMessages,
    markMessagesRead,
    deleteMessageForAll,
    deleteMessageForMe,
    votePoll,
};
