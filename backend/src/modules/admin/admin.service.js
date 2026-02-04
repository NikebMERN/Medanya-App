// src/modules/admin/admin.service.js
const { pool } = require("../../config/mysql");
const { ALLOWED_ROLES, ROLES } = require("../../utils/roles.util");

const listUsers = async ({ page = 1, limit = 20 }) => {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (p - 1) * l;

    const [[countRow]] = await pool.query(`SELECT COUNT(*) AS total FROM users`);
    const [rows] = await pool.query(
        `
    SELECT id, phone_number, role, is_verified, is_banned, created_at, updated_at
    FROM users
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
    `,
        [l, offset],
    );

    return {
        page: p,
        limit: l,
        total: countRow.total,
        users: rows,
    };
};

const getAdminCount = async () => {
    const [[row]] = await pool.query(
        `SELECT COUNT(*) AS admins FROM users WHERE role = ?`,
        [ROLES.ADMIN],
    );
    return row.admins || 0;
};

const getUserById = async (userId) => {
    const [rows] = await pool.query(
        `SELECT id, role, is_banned FROM users WHERE id = ?`,
        [userId],
    );
    return rows[0] || null;
};

const setUserRole = async (userId, role) => {
    if (!ALLOWED_ROLES.includes(role)) {
        const err = new Error("Invalid role");
        err.status = 400;
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const target = await getUserById(userId);
    if (!target) {
        const err = new Error("User not found");
        err.status = 404;
        err.code = "NOT_FOUND";
        throw err;
    }

    // Prevent removing the last admin
    if (target.role === ROLES.ADMIN && role !== ROLES.ADMIN) {
        const adminCount = await getAdminCount();
        if (adminCount <= 1) {
            const err = new Error("Cannot remove the last admin");
            err.status = 409;
            err.code = "LAST_ADMIN_BLOCKED";
            throw err;
        }
    }

    const [result] = await pool.query(`UPDATE users SET role = ? WHERE id = ?`, [
        role,
        userId,
    ]);

    return result.affectedRows > 0;
};

const banUser = async (userId, banned) => {
    const target = await getUserById(userId);
    if (!target) {
        const err = new Error("User not found");
        err.status = 404;
        err.code = "NOT_FOUND";
        throw err;
    }

    // Optional safety: avoid banning the last admin (common practice)
    if (target.role === ROLES.ADMIN && banned === true) {
        const adminCount = await getAdminCount();
        if (adminCount <= 1) {
            const err = new Error("Cannot ban the last admin");
            err.status = 409;
            err.code = "LAST_ADMIN_BLOCKED";
            throw err;
        }
    }

    const [result] = await pool.query(
        `UPDATE users SET is_banned = ? WHERE id = ?`,
        [banned ? 1 : 0, userId],
    );

    return result.affectedRows > 0;
};

module.exports = {
    listUsers,
    setUserRole,
    banUser,
    getAdminCount,
};
