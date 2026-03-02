// src/modules/inAppNotifications/inAppNotifications.service.js
const { pool } = require("../../config/mysql");

function asUserId(u) {
    return String(u?.id ?? u?.userId ?? "");
}

async function createForUser(userId, { title, body, data = {} }) {
    const [res] = await pool.query(
        `INSERT INTO in_app_notifications (user_id, title, body, data_json, seen)
         VALUES (?, ?, ?, ?, 0)`,
        [userId, title || "Notification", body || "", JSON.stringify(data || {})],
    );
    return res.insertId;
}

async function listByUser(user, { page = 1, limit = 20 } = {}) {
    const userId = asUserId(user);
    if (!userId) return { page: 1, limit: 20, total: 0, notifications: [], unseenCount: 0 };

    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const offset = (p - 1) * l;

    const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM in_app_notifications WHERE user_id = ?`,
        [userId],
    );
    const [[unseenRow]] = await pool.query(
        `SELECT COUNT(*) AS c FROM in_app_notifications WHERE user_id = ? AND seen = 0`,
        [userId],
    );

    const [rows] = await pool.query(
        `SELECT id, title, body, data_json, seen, created_at
         FROM in_app_notifications WHERE user_id = ?
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [userId, l, offset],
    );

    const notifications = rows.map((r) => {
        let data_json = null;
        try {
            data_json = r.data_json ? JSON.parse(r.data_json) : null;
        } catch (_) {}
        return {
            id: r.id,
            title: r.title,
            body: r.body,
            data: data_json,
            seen: !!r.seen,
            createdAt: r.created_at,
        };
    });

    return {
        page: p,
        limit: l,
        total: countRow.total,
        unseenCount: unseenRow.c,
        notifications,
    };
}

async function markSeen(user, notificationId) {
    const userId = asUserId(user);
    if (!userId) return 0;
    const [res] = await pool.query(
        `UPDATE in_app_notifications SET seen = 1 WHERE id = ? AND user_id = ?`,
        [notificationId, userId],
    );
    return res.affectedRows;
}

async function markAllSeen(user) {
    const userId = asUserId(user);
    if (!userId) return 0;
    const [res] = await pool.query(
        `UPDATE in_app_notifications SET seen = 1 WHERE user_id = ? AND seen = 0`,
        [userId],
    );
    return res.affectedRows;
}

async function getUnseenCount(user) {
    const userId = asUserId(user);
    if (!userId) return 0;
    const [[row]] = await pool.query(
        `SELECT COUNT(*) AS c FROM in_app_notifications WHERE user_id = ? AND seen = 0`,
        [userId],
    );
    return row?.c ?? 0;
}

async function deleteById(user, notificationId) {
    const userId = asUserId(user);
    if (!userId) return 0;
    const [res] = await pool.query(
        `DELETE FROM in_app_notifications WHERE id = ? AND user_id = ?`,
        [notificationId, userId],
    );
    return res.affectedRows;
}

/** Create "New Card Order" notification for seller if not already created. Idempotent. Call when buyer pays (fallback if webhook didn't fire). */
async function createOrderNotificationForSellerIfNotExists(orderId, sellerId, { totalCents, qty }) {
    const oid = String(orderId || "").trim();
    const sid = String(sellerId || "").trim();
    if (!oid || !sid) return null;
    const [rows] = await pool.query(
        `SELECT id FROM in_app_notifications
         WHERE user_id = ? AND title = 'New Card Order'
           AND (data_json LIKE CONCAT('%"orderId":', ?, '%') OR data_json LIKE CONCAT('%"orderId":"', ?, '"%'))
         LIMIT 1`,
        [sid, oid, oid],
    );
    if (rows && rows.length > 0) return rows[0].id;
    const amountStr = totalCents != null ? `${((totalCents || 0) / 100).toFixed(2)} AED` : "";
    const qtyStr = String(qty ?? 1);
    return createForUser(sid, {
        title: "New Card Order",
        body: `Order #${oid}: ${amountStr} (qty: ${qtyStr}). Payment received.`,
        data: { type: "order", orderId: oid },
    });
}

/** Delete all in-app notifications for an order (both buyer and seller). Call when order is delivered or cancelled. */
async function deleteByOrderId(orderId) {
    const oid = String(orderId || "").trim();
    if (!oid) return 0;
    const [res] = await pool.query(
        `DELETE FROM in_app_notifications
         WHERE data_json LIKE '%"type":"order"%'
           AND (data_json LIKE CONCAT('%"orderId":', ?, '%') OR data_json LIKE CONCAT('%"orderId":"', ?, '"%'))`,
        [oid, oid],
    );
    return res.affectedRows;
}

module.exports = {
    createForUser,
    createOrderNotificationForSellerIfNotExists,
    listByUser,
    markSeen,
    markAllSeen,
    getUnseenCount,
    deleteById,
    deleteByOrderId,
};
