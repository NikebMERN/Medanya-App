// src/modules/livestream/stream.socket.js
const mongoose = require("mongoose");
const Stream = require("./stream.model");
const service = require("./stream.service");
const logger = require("../../utils/logger.util");

const KICK_REENTRY_MS = 5 * 60 * 1000;

const mutedByStream = new Map();
const kickedByStream = new Map();

function getMutedSet(streamId) {
    let set = mutedByStream.get(streamId);
    if (!set) {
        set = new Set();
        mutedByStream.set(streamId, set);
    }
    return set;
}

function getKickedMap(streamId) {
    let map = kickedByStream.get(streamId);
    if (!map) {
        map = new Map();
        kickedByStream.set(streamId, map);
    }
    return map;
}

function isKicked(streamId, userId) {
    const map = getKickedMap(streamId);
    const expireAt = map.get(String(userId));
    if (!expireAt) return false;
    if (Date.now() > expireAt) {
        map.delete(String(userId));
        return false;
    }
    return true;
}

function createLimiter({ windowMs = 60_000, max = 20 }) {
    const hits = new Map(); // key -> {count, resetAt}
    return {
        allow(key) {
            const now = Date.now();
            const e = hits.get(key);
            if (!e || now > e.resetAt) {
                hits.set(key, { count: 1, resetAt: now + windowMs });
                return true;
            }
            if (e.count >= max) return false;
            e.count += 1;
            return true;
        },
    };
}

function okAck(ack, payload = {}) {
    ack && ack({ ok: true, ...payload });
}
function badAck(ack, code, message) {
    ack && ack({ ok: false, error: code, message });
}

async function isLiveStream(streamId) {
    if (!mongoose.isValidObjectId(streamId)) return null;
    return Stream.findById(streamId).lean();
}

function registerStreamSocket(io, socket) {
    const userId = String(socket.user.id);
    const limiter = createLimiter({ windowMs: 60_000, max: 30 });
    const giftLimiter = createLimiter({ windowMs: 60_000, max: 10 });
    const joined = new Set(); // streamIds

    socket.on("stream:join", async (payload = {}, ack) => {
        try {
            if (!limiter.allow(`join:${userId}`))
                return badAck(ack, "RATE_LIMIT", "Too many joins");

            const streamId = payload?.streamId;
            const stream = await isLiveStream(streamId);
            if (!stream) return badAck(ack, "NOT_FOUND", "Stream not found");
            if (stream.status !== "live")
                return badAck(ack, "STREAM_NOT_LIVE", "Stream not live");

            const room = `stream:${streamId}`;
            if (!joined.has(streamId)) {
                joined.add(streamId);
                socket.join(room);

                // best effort viewerCount increment (in-memory)
                io.to(room).emit("stream:viewerCount", {
                    streamId,
                    viewerCount: (stream.viewerCount || 0) + 1,
                });

                // update mongo best effort
                Stream.updateOne({ _id: streamId }, { $inc: { viewerCount: 1 } }).catch(
                    () => { },
                );
            }

            return okAck(ack, { stream });
        } catch (e) {
            logger.error("stream:join error", e);
            return badAck(ack, "SERVER_ERROR", "join failed");
        }
    });

    socket.on("stream:leave", async (payload = {}, ack) => {
        try {
            const streamId = payload?.streamId;
            if (!streamId) return badAck(ack, "BAD_REQUEST", "streamId required");

            const room = `stream:${streamId}`;
            if (joined.has(streamId)) {
                joined.delete(streamId);
                socket.leave(room);

                Stream.updateOne(
                    { _id: streamId },
                    { $inc: { viewerCount: -1 } },
                ).catch(() => { });
                const doc = await Stream.findById(streamId)
                    .lean()
                    .catch(() => null);
                io.to(room).emit("stream:viewerCount", {
                    streamId,
                    viewerCount: Math.max(doc?.viewerCount || 0, 0),
                });
            }

            return okAck(ack);
        } catch (e) {
            logger.error("stream:leave error", e);
            return badAck(ack, "SERVER_ERROR", "leave failed");
        }
    });

    socket.on("stream:chat:send", async (payload = {}, ack) => {
        try {
            if (!limiter.allow(`chat:${userId}`))
                return badAck(ack, "RATE_LIMIT", "Too many messages");
            const streamId = payload?.streamId;
            const text = String(payload?.text || "").trim();
            if (!mongoose.isValidObjectId(streamId))
                return badAck(ack, "INVALID_STREAM", "Invalid streamId");
            if (!text) return badAck(ack, "BAD_REQUEST", "text required");
            if (!joined.has(streamId))
                return badAck(ack, "FORBIDDEN", "Join stream first");
            if (getMutedSet(streamId).has(userId))
                return badAck(ack, "MUTED", "You are muted in this stream");

            const stream = await Stream.findById(streamId).lean();
            if (!stream) return badAck(ack, "NOT_FOUND", "Stream not found");
            if (stream.status !== "live")
                return badAck(ack, "STREAM_NOT_LIVE", "Stream not live");

            const message = await service.persistChatMessage({
                streamId,
                senderId: userId,
                text,
            });
            io.to(`stream:${streamId}`).emit("stream:chat:new", {
                streamId,
                message,
            });

            return okAck(ack, { message });
        } catch (e) {
            logger.error("stream:chat:send error", e);
            return badAck(ack, "SERVER_ERROR", "chat failed");
        }
    });

    socket.on("stream:gift:send", async (payload = {}, ack) => {
        try {
            if (!giftLimiter.allow(`gift:${userId}`))
                return badAck(ack, "RATE_LIMIT", "Too many gifts");

            const streamId = payload?.streamId;
            const giftId = String(payload?.giftId || "");
            const quantity = payload?.quantity;

            if (!joined.has(streamId))
                return badAck(ack, "FORBIDDEN", "Join stream first");

            const result = await service.sendGift({
                viewerId: userId,
                streamId,
                giftId,
                quantity,
            });

            io.to(`stream:${streamId}`).emit("stream:gift:new", result.giftEvent);
            return okAck(ack, result);
        } catch (e) {
            const code = e.code || "SERVER_ERROR";
            if (code === "INSUFFICIENT_FUNDS")
                return badAck(ack, "INSUFFICIENT_FUNDS", "Insufficient funds");
            if (code === "STREAM_NOT_LIVE")
                return badAck(ack, "STREAM_NOT_LIVE", "Stream not live");
            if (code === "INVALID_GIFT")
                return badAck(ack, "INVALID_GIFT", "Invalid gift");
            logger.error("stream:gift:send error", e);
            return badAck(ack, "SERVER_ERROR", "gift failed");
        }
    });

    socket.on("stream:mute", async (payload = {}, ack) => {
        try {
            const streamId = payload?.streamId;
            const targetUserId = String(payload?.targetUserId || "");
            if (!mongoose.isValidObjectId(streamId) || !targetUserId)
                return badAck(ack, "BAD_REQUEST", "streamId and targetUserId required");

            const stream = await Stream.findById(streamId).lean();
            if (!stream) return badAck(ack, "NOT_FOUND", "Stream not found");
            if (stream.status !== "live")
                return badAck(ack, "STREAM_NOT_LIVE", "Stream not live");

            const isHost = stream.hostId === userId;
            const isAdmin = socket.user?.role === "admin";
            if (!isHost && !isAdmin)
                return badAck(ack, "FORBIDDEN", "Only host or admin can mute");

            getMutedSet(streamId).add(targetUserId);
            io.to(`stream:${streamId}`).emit("stream:user:muted", { streamId, userId: targetUserId });
            return okAck(ack, { muted: true });
        } catch (e) {
            logger.error("stream:mute error", e);
            return badAck(ack, "SERVER_ERROR", "mute failed");
        }
    });

    socket.on("stream:unmute", async (payload = {}, ack) => {
        try {
            const streamId = payload?.streamId;
            const targetUserId = String(payload?.targetUserId || "");
            if (!mongoose.isValidObjectId(streamId) || !targetUserId)
                return badAck(ack, "BAD_REQUEST", "streamId and targetUserId required");

            const stream = await Stream.findById(streamId).lean();
            if (!stream) return badAck(ack, "NOT_FOUND", "Stream not found");
            const isHost = stream.hostId === userId;
            const isAdmin = socket.user?.role === "admin";
            if (!isHost && !isAdmin)
                return badAck(ack, "FORBIDDEN", "Only host or admin can unmute");

            getMutedSet(streamId).delete(targetUserId);
            return okAck(ack, { unmuted: true });
        } catch (e) {
            logger.error("stream:unmute error", e);
            return badAck(ack, "SERVER_ERROR", "unmute failed");
        }
    });

    socket.on("stream:kick", async (payload = {}, ack) => {
        try {
            const streamId = payload?.streamId;
            const targetUserId = String(payload?.targetUserId || "");
            if (!mongoose.isValidObjectId(streamId) || !targetUserId)
                return badAck(ack, "BAD_REQUEST", "streamId and targetUserId required");

            const stream = await Stream.findById(streamId).lean();
            if (!stream) return badAck(ack, "NOT_FOUND", "Stream not found");
            if (stream.status !== "live")
                return badAck(ack, "STREAM_NOT_LIVE", "Stream not live");

            const isHost = stream.hostId === userId;
            const isAdmin = socket.user?.role === "admin";
            if (!isHost && !isAdmin)
                return badAck(ack, "FORBIDDEN", "Only host or admin can kick");

            const room = `stream:${streamId}`;
            const sockets = await io.in(room).fetchSockets();
            const targetSocket = sockets.find((s) => String(s.user?.id) === targetUserId);
            if (targetSocket) {
                getKickedMap(streamId).set(targetUserId, Date.now() + KICK_REENTRY_MS);
                targetSocket.emit("stream:kicked", { streamId, message: "You were removed from the stream" });
                targetSocket.leave(room);
                Stream.updateOne({ _id: streamId }, { $inc: { viewerCount: -1 } }).catch(() => {});
                const doc = await Stream.findById(streamId).lean().catch(() => null);
                io.to(room).emit("stream:viewerCount", {
                    streamId,
                    viewerCount: Math.max(doc?.viewerCount ?? 0, 0),
                });
            }
            return okAck(ack, { kicked: true });
        } catch (e) {
            logger.error("stream:kick error", e);
            return badAck(ack, "SERVER_ERROR", "kick failed");
        }
    });
}

module.exports = { registerStreamSocket };
