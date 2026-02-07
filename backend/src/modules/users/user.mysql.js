// src/modules/users/user.mysql.js
const { pool } = require("../../config/mysql");

async function getById(userId) {
    const [rows] = await pool.query(
        `SELECT id, phone_number, display_name, avatar_url, role, is_verified,
            privacy_hide_phone, notification_enabled, is_banned, banned_reason, is_active,
            created_at, updated_at
     FROM users WHERE id = ? LIMIT 1`,
        [userId],
    );
    return rows[0] || null;
}

async function updateById(userId, fields) {
    const allowed = {
        display_name: fields.display_name,
        avatar_url: fields.avatar_url,
        privacy_hide_phone: fields.privacy_hide_phone,
        notification_enabled: fields.notification_enabled,
    };

    const keys = Object.keys(allowed).filter((k) => allowed[k] !== undefined);
    if (keys.length === 0) return getById(userId);

    const setSql = keys.map((k) => `${k} = ?`).join(", ");
    const values = keys.map((k) => allowed[k]);
    values.push(userId);

    await pool.query(`UPDATE users SET ${setSql} WHERE id = ?`, values);
    return getById(userId);
}

async function deactivate(userId) {
    await pool.query(`UPDATE users SET is_active = 0 WHERE id = ?`, [userId]);
    return true;
}

async function adminSearch({ query = "", page = 1, limit = 20 }) {
    const q = String(query || "").trim();
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (p - 1) * l;

    const like = `%${q}%`;

    const where =
        q.length > 0
            ? `WHERE phone_number LIKE ? OR display_name LIKE ? OR CAST(id AS CHAR) LIKE ?`
            : ``;

    const params = q.length > 0 ? [like, like, like, l, offset] : [l, offset];

    const [rows] = await pool.query(
        `SELECT id, phone_number, display_name, avatar_url, role, is_verified,
            privacy_hide_phone, notification_enabled, is_banned, banned_reason, is_active,
            created_at, updated_at
     FROM users
     ${where}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
        params,
    );

    const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM users ${q.length > 0 ? where : ""}`,
        q.length > 0 ? [like, like, like] : [],
    );

    return { page: p, limit: l, total: countRows[0].total, users: rows };
}

async function setRole(userId, role) {
    await pool.query(`UPDATE users SET role = ? WHERE id = ?`, [role, userId]);
    return getById(userId);
}

async function banUser(userId, isBanned, reason = null) {
    await pool.query(
        `UPDATE users SET is_banned = ?, banned_reason = ? WHERE id = ?`,
        [isBanned ? 1 : 0, reason, userId],
    );
    return getById(userId);
}

async function countAdmins() {
    const [rows] = await pool.query(
        `SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND is_active=1`,
    );
    return rows[0]?.c || 0;
}

module.exports = {
    getById,
    updateById,
    deactivate,
    adminSearch,
    setRole,
    banUser,
    countAdmins,
};
