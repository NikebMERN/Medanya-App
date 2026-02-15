// src/modules/admin/admin.service.js
const { pool } = require("../../config/mysql");
const followDb = require("../users/follow.mysql");
const ListingReport = require("../reports/listingReport.model");
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

const setUserRole = async (userId, role, currentUserId) => {
    if (!ALLOWED_ROLES.includes(role)) {
        const err = new Error("Invalid role");
        err.status = 400;
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const targetUserId = Number(userId);
    if (currentUserId != null && targetUserId === Number(currentUserId)) {
        const err = new Error("Cannot change your own role");
        err.status = 403;
        err.code = "SELF_ROLE_CHANGE_FORBIDDEN";
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

const getUserRisk = async (userId) => {
    const uid = String(userId);
    const userReports = await ListingReport.countDocuments({
        targetType: "user",
        targetId: uid,
    });
    const [blocking, blockedBy] = await Promise.all([
        followDb.countBlocking(uid),
        followDb.countBlockedBy(uid),
    ]);
    const [[jobsCount]] = await pool.query(
        `SELECT COUNT(*) AS c FROM jobs WHERE created_by = ?`,
        [uid],
    );
    const [[listingsCount]] = await pool.query(
        `SELECT COUNT(*) AS c FROM marketplace_items WHERE seller_id = ?`,
        [uid],
    );
    return {
        reportsCount: userReports,
        blockingCount: blocking,
        blockedByCount: blockedBy,
        jobsCount: jobsCount?.c ?? 0,
        listingsCount: listingsCount?.c ?? 0,
    };
};

module.exports = {
    listUsers,
    setUserRole,
    banUser,
    getAdminCount,
    getUserRisk,
};
