// src/modules/livestream/stream.socket.js
const mongoose = require("mongoose");
const Stream = require("./stream.model");
const service = require("./stream.service");
const logger = require("../../utils/logger.util");

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
}

module.exports = { registerStreamSocket };
