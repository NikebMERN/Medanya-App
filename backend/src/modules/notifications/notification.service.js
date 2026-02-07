// src/modules/notifications/notification.service.js
const { pool } = require("../../config/mysql");
const { notificationQueue } = require("../../jobs/queues/notification.queue");
const firebase = require("./providers/firebase");
const NotificationLog = require("./notification.model"); // optional, used if mongo connected

function err(code, message) {
    const e = new Error(message || code);
    e.code = code;
    return e;
}

function asUserId(u) {
    return String(u?.id ?? u?.userId ?? "");
}

function normalizePlatform(p) {
    const v = String(p || "android").toLowerCase();
    if (!["ios", "android", "web"].includes(v))
        throw err("VALIDATION_ERROR", "Invalid platform");
    return v;
}

async function upsertDeviceToken(user, { token, platform }) {
    const userId = asUserId(user);
    if (!userId) throw err("UNAUTHORIZED", "Auth required");
    if (!token || typeof token !== "string")
        throw err("VALIDATION_ERROR", "token required");

    const plat = normalizePlatform(platform);

    await pool.query(
        `INSERT INTO user_device_tokens (user_id, token, platform)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), platform = VALUES(platform)`,
        [userId, token, plat],
    );

    return { userId, token, platform: plat };
}

async function removeDeviceToken(user, { token }) {
    const userId = asUserId(user);
    if (!userId) throw err("UNAUTHORIZED", "Auth required");
    if (!token || typeof token !== "string")
        throw err("VALIDATION_ERROR", "token required");

    await pool.query(
        "DELETE FROM user_device_tokens WHERE user_id = ? AND token = ?",
        [userId, token],
    );
    return { removed: true };
}

async function getUserTokens(userId) {
    const [rows] = await pool.query(
        "SELECT token FROM user_device_tokens WHERE user_id = ?",
        [String(userId)],
    );
    return rows.map((r) => r.token);
}

async function deleteBadTokens(tokens) {
    if (!tokens?.length) return;
    // remove globally by token (uniq_token)
    const placeholders = tokens.map(() => "?").join(",");
    await pool.query(
        `DELETE FROM user_device_tokens WHERE token IN (${placeholders})`,
        tokens,
    );
}

/**
 * Public API: enqueue send to users
 */
async function sendToUsers({ userIds, title, body, data = {} }) {
    if (!Array.isArray(userIds) || userIds.length === 0)
        throw err("VALIDATION_ERROR", "userIds[] required");
    if (!title || !body) throw err("VALIDATION_ERROR", "title/body required");

    // optional log
    const logIds = [];
    try {
        for (const uid of userIds) {
            const doc = await NotificationLog.create({
                userId: String(uid),
                title,
                body,
                data,
                status: "queued",
            });
            logIds.push(doc._id.toString());
        }
    } catch {
        // ignore if mongo not used
    }

    await notificationQueue.add("sendToUsers", {
        type: "sendToUsers",
        payload: { userIds: userIds.map(String), title, body, data, logIds },
    });

    return { queued: true, count: userIds.length };
}

/**
 * Public API: enqueue send to topic
 */
async function sendToTopic({ topic, title, body, data = {} }) {
    if (!topic || typeof topic !== "string")
        throw err("VALIDATION_ERROR", "topic required");
    if (!title || !body) throw err("VALIDATION_ERROR", "title/body required");

    await notificationQueue.add("sendToTopic", {
        type: "sendToTopic",
        payload: { topic, title, body, data },
    });

    return { queued: true, topic };
}

/**
 * Worker calls these "NOW" methods
 */
async function _sendToUsersNow({ userIds, title, body, data, logIds = [] }) {
    // collect tokens
    const allTokens = [];
    for (const uid of userIds) {
        const tokens = await getUserTokens(uid);
        allTokens.push(...tokens);
    }

    if (allTokens.length === 0) {
        await markLogs(logIds, "failed", "NO_TOKENS");
        return { sent: 0, failed: userIds.length, reason: "NO_TOKENS" };
    }

    const resp = await firebase.sendToTokens({
        tokens: allTokens,
        notification: { title, body },
        data,
    });

    // detect invalid tokens
    const badTokens = [];
    resp.responses.forEach((r, idx) => {
        if (!r.success) {
            const code = r.error?.code || "";
            if (
                code.includes("registration-token-not-registered") ||
                code.includes("invalid-argument") ||
                code.includes("messaging/invalid-registration-token")
            ) {
                badTokens.push(allTokens[idx]);
            }
        }
    });

    if (badTokens.length) await deleteBadTokens(badTokens);

    await markLogs(logIds, "sent", "");

    return {
        tokens: allTokens.length,
        successCount: resp.successCount,
        failureCount: resp.failureCount,
        badTokens: badTokens.length,
    };
}

async function _sendToTopicNow({ topic, title, body, data }) {
    const resp = await firebase.sendToTopic({
        topic,
        notification: { title, body },
        data,
    });
    return { ok: true, messageId: resp };
}

async function markLogs(logIds, status, error) {
    try {
        if (!logIds?.length) return;
        await NotificationLog.updateMany(
            { _id: { $in: logIds } },
            { $set: { status, error: error || "" } },
        );
    } catch { }
}

async function listMyLogs(user, { page = 1, limit = 20 }) {
    const userId = asUserId(user);
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const skip = (p - 1) * l;

    try {
        const [items, total] = await Promise.all([
            NotificationLog.find({ userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(l)
                .lean(),
            NotificationLog.countDocuments({ userId }),
        ]);
        return { page: p, limit: l, total, notifications: items };
    } catch {
        return { page: p, limit: l, total: 0, notifications: [] };
    }
}

module.exports = {
    upsertDeviceToken,
    removeDeviceToken,
    listMyLogs,
    sendToUsers,
    sendToTopic,

    // worker internal
    _sendToUsersNow,
    _sendToTopicNow,
};
