// src/sockets/presence.socket.js
const { redisClient } = require("../config/redis");
const logger = require("../utils/logger.util");

// In-memory fallback map: userId -> Set(socketIds)
const userSockets = new Map();

function getUserKey(userId) {
    return `presence:user:${userId}`;
}
function getSocketKey(socketId) {
    return `presence:socket:${socketId}`;
}

async function onConnect(io, socket) {
    const userId = String(socket.user.id);
    const socketId = socket.id;

    // memory
    let set = userSockets.get(userId);
    const wasOffline = !set || set.size === 0;
    if (!set) {
        set = new Set();
        userSockets.set(userId, set);
    }
    set.add(socketId);

    // redis (best-effort)
    await redisBestEffort(async () => {
        await redisClient.sAdd(getUserKey(userId), socketId);
        await redisClient.set(getSocketKey(socketId), userId, { EX: 60 * 60 }); // 1h safety ttl
        await redisClient.expire(getUserKey(userId), 60 * 60); // refresh ttl
    });

    if (wasOffline) {
        io.emit("presence:online", { userId, lastSeen: null });
    }
}

async function onDisconnect(io, socket) {
    const userId = String(socket.user.id);
    const socketId = socket.id;

    // memory cleanup
    const set = userSockets.get(userId);
    if (set) {
        set.delete(socketId);
        if (set.size === 0) {
            userSockets.delete(userId);
        }
    }

    // redis cleanup
    await redisBestEffort(async () => {
        await redisClient.sRem(getUserKey(userId), socketId);
        await redisClient.del(getSocketKey(socketId));
    });

    // Determine if user fully offline (no sockets remain)
    const stillOnline =
        (userSockets.get(userId) && userSockets.get(userId).size > 0) ||
        (await redisHasAnySockets(userId));

    if (!stillOnline) {
        io.emit("presence:offline", {
            userId,
            lastSeen: new Date().toISOString(),
        });
    }
}

async function redisHasAnySockets(userId) {
    // If redis not available, rely on memory only
    if (!redisClient || !redisClient.isOpen) return false;

    try {
        const count = await redisClient.sCard(getUserKey(String(userId)));
        return Number(count) > 0;
    } catch (e) {
        logger.warn("redisHasAnySockets failed, falling back to memory");
        return false;
    }
}

async function redisBestEffort(fn) {
    if (!redisClient || !redisClient.isOpen) return;
    try {
        await fn();
    } catch (e) {
        logger.warn("Redis presence op failed (non-fatal)");
    }
}

module.exports = { onConnect, onDisconnect };
