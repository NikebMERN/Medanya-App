// src/sockets/index.js
const { verifySocketJWT } = require("../utils/socketAuth.util");
const presence = require("./presence.socket");
const logger = require("../utils/logger.util");

const registerChatSocket = require("../modules/chats/chat.socket");
const { registerVideoSocket } = require("../modules/videos/video.socket");
const { registerStreamSocket } = require("../modules/livestream/stream.socket");

function registerSockets(io) {
    // 1) JWT socket authentication middleware
    io.use(async (socket, next) => {
        try {
            const user = await verifySocketJWT(socket);
            socket.user = user; // { id, phone_number, role }
            return next();
        } catch (err) {
            const message = err?.message || "Unauthorized";
            logger.warn(`Socket auth failed: ${message}`);
            // Socket.IO expects Error to reject
            return next(new Error("AUTH_ERROR"));
        }
    });

    io.on("connection", (socket) => {
        logger.info(`🟢 Socket connected ${socket.id} user=${socket.user?.id}`);

        // Presence connect
        presence
            .onConnect(io, socket)
            .catch((e) => logger.error("presence.onConnect error", e));

        // Join personal room by default
        const personalRoom = `user:${socket.user.id}`;
        socket.join(personalRoom);

        // ✅ Admin sockets join a private admins room (for pending videos + reports)
        if (socket.user?.role === "admin") {
            socket.join("admins");
        }

        // Lightweight per-socket rate limit (join/leave)
        const limiter = createEventLimiter({ windowMs: 5000, max: 20 });

        // a) presence:ping (optional heartbeat)
        socket.on("presence:ping", () => {
            socket.emit("presence:pong", { t: Date.now() });
        });

        // b) room:join {roomId} ack
        socket.on("room:join", async (payload = {}, ack = () => { }) => {
            if (!limiter.allow("room:join")) {
                return ack({
                    ok: false,
                    error: { code: "RATE_LIMIT", message: "Too many requests" },
                });
            }

            const roomId = payload?.roomId;
            const validation = validateRoomId(roomId, socket.user.id);
            if (!validation.ok) return ack(validation.err);

            try {
                socket.join(roomId);
                return ack({ ok: true });
            } catch (e) {
                logger.error("room:join error", e);
                return ack({
                    ok: false,
                    error: { code: "SERVER_ERROR", message: "Failed to join room" },
                });
            }
        });

        // c) room:leave {roomId} ack
        socket.on("room:leave", async (payload = {}, ack = () => { }) => {
            if (!limiter.allow("room:leave")) {
                return ack({
                    ok: false,
                    error: { code: "RATE_LIMIT", message: "Too many requests" },
                });
            }

            const roomId = payload?.roomId;
            const validation = validateRoomId(roomId, socket.user.id);
            if (!validation.ok) return ack(validation.err);

            // Prevent leaving personal room (foundation rule)
            if (roomId === `user:${socket.user.id}`) {
                return ack({
                    ok: false,
                    error: { code: "FORBIDDEN", message: "Cannot leave personal room" },
                });
            }

            try {
                socket.leave(roomId);
                return ack({ ok: true });
            } catch (e) {
                logger.error("room:leave error", e);
                return ack({
                    ok: false,
                    error: { code: "SERVER_ERROR", message: "Failed to leave room" },
                });
            }
        });

        // ✅ Step-6: register chat events on this socket
        registerChatSocket(io, socket);

        // ✅ Step-7: register video events on this socket
        registerVideoSocket(io, socket);

        // ✅ Step-8: register livestream events on this socket
        registerStreamSocket(io, socket);

        socket.on("disconnect", async () => {
            logger.info(
                `🔴 Socket disconnected ${socket.id} user=${socket.user?.id}`,
            );
            await presence
                .onDisconnect(io, socket)
                .catch((e) => logger.error("presence.onDisconnect error", e));
        });
    });
}

function validateRoomId(roomId, userId) {
    // ✅ Allow video:{mongoObjectId} rooms (for short video realtime)
    if (roomId.startsWith("video:")) {
        const raw = roomId.slice(6);
        if (!raw || !/^[a-fA-F0-9]{24}$/.test(raw)) {
            return {
                ok: false,
                err: {
                    ok: false,
                    error: {
                        code: "BAD_REQUEST",
                        message: "Invalid video roomId format",
                    },
                },
            };
        }
        return { ok: true };
    }

    // Allowed patterns:
    // - user:{userId} (only your own)
    // - room:{roomId} (generic rooms for future modules)
    const userRoom = `user:${userId}`;
    if (roomId.startsWith("user:")) {
        if (roomId !== userRoom) {
            return {
                ok: false,
                err: {
                    ok: false,
                    error: {
                        code: "FORBIDDEN",
                        message: "Cannot join another user's room",
                    },
                },
            };
        }
        return { ok: true };
    }

    if (roomId.startsWith("room:")) {
        // basic room id validation after prefix
        const raw = roomId.slice(5);
        if (!raw || raw.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(raw)) {
            return {
                ok: false,
                err: {
                    ok: false,
                    error: { code: "BAD_REQUEST", message: "Invalid roomId format" },
                },
            };
        }
        return { ok: true };
    }

    return {
        ok: false,
        err: {
            ok: false,
            error: { code: "FORBIDDEN", message: "Room pattern not allowed" },
        },
    };
}

function createEventLimiter({ windowMs, max }) {
    const state = new Map(); // eventName -> { count, resetAt }

    return {
        allow(eventName) {
            const now = Date.now();
            const key = eventName;
            const entry = state.get(key);

            if (!entry || now > entry.resetAt) {
                state.set(key, { count: 1, resetAt: now + windowMs });
                return true;
            }

            if (entry.count >= max) return false;
            entry.count += 1;
            return true;
        },
    };
}

module.exports = registerSockets;
