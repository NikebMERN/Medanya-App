// src/modules/admin/admin.service.js
const { pool } = require("../../config/mysql");
const followDb = require("../users/follow.mysql");
const ListingReport = require("../reports/listingReport.model");
const { ALLOWED_ROLES, ROLES } = require("../../utils/roles.util");
const { computeUserRiskScore, getRiskLabel } = require("../../utils/riskScore.util");

const listUsers = async ({ page = 1, limit = 20, query: searchQuery = "" }) => {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (p - 1) * l;
    const q = String(searchQuery || "").trim();
    const like = q ? `%${q}%` : null;

    let where = "";
    const countParams = [];
    const listParams = [];
    if (like) {
        where = "WHERE phone_number LIKE ? OR display_name LIKE ? OR CAST(id AS CHAR) LIKE ?";
        countParams.push(like, like, like);
        listParams.push(like, like, like);
    }
    listParams.push(l, offset);

    const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM users ${where}`,
        countParams,
    );
    const [rows] = await pool.query(
        `
    SELECT id, phone_number, display_name, role, is_verified, is_banned,
           otp_verified, kyc_status, kyc_level, kyc_face_verified, created_at, updated_at
    FROM users
    ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
    `,
        listParams,
    );

    const users = await Promise.all(
        rows.map(async (u) => {
            const reportsCount = await ListingReport.countDocuments({
                targetType: "user",
                targetId: String(u.id),
            }).catch(() => 0);
            const bars = await computeUserRiskScore(u, reportsCount);
            return {
                ...u,
                risk_score: bars,
                risk_label: getRiskLabel(bars),
            };
        })
    );

    return {
        page: p,
        limit: l,
        total: countRow.total,
        users,
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

const listReportedUsers = async ({ page = 1, limit = 20 }) => {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (p - 1) * l;

    const agg = await ListingReport.aggregate([
        { $match: { targetType: "user" } },
        {
            $group: {
                _id: "$targetId",
                reportCount: { $sum: 1 },
                reasons: { $push: "$reason" },
                latestAt: { $max: "$createdAt" },
                latestReason: { $last: "$reason" },
                latestDescription: { $last: "$description" },
                reporterIds: { $addToSet: "$reporterId" },
            },
        },
        { $sort: { reportCount: -1, latestAt: -1 } },
        { $skip: skip },
        { $limit: l },
    ]);

    const [{ total }] = await ListingReport.aggregate([
        { $match: { targetType: "user" } },
        { $group: { _id: "$targetId" } },
        { $count: "total" },
    ]).then((r) => (r.length ? r : [{ total: 0 }]));
    const targetIds = agg.map((a) => a._id).filter(Boolean);
    if (targetIds.length === 0) {
        return { page: p, limit: l, total, reportedUsers: [] };
    }

    const placeholders = targetIds.map(() => "?").join(",");
    const [rows] = await pool.query(
        `SELECT id, phone_number, display_name, role, is_banned, otp_verified, kyc_status, kyc_face_verified, created_at
         FROM users WHERE id IN (${placeholders})`,
        targetIds,
    );
    const userMap = Object.fromEntries(rows.map((u) => [String(u.id), u]));

    const reportedUsers = agg.map((a) => {
        const u = userMap[a._id] || {};
        const bars = Math.min(5, Math.ceil((a.reportCount || 0) / 2));
        const riskLabel = a.reportCount >= 5 ? "risky" : a.reportCount >= 2 ? "half-safe" : "safe";
        return {
            ...u,
            reportCount: a.reportCount,
            latestReportAt: a.latestAt,
            latestReason: a.latestReason,
            latestDescription: a.latestDescription,
            risk_score: bars,
            risk_label: riskLabel,
        };
    });

    return {
        page: p,
        limit: l,
        total,
        reportedUsers,
    };
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
    listReportedUsers,
    setUserRole,
    banUser,
    getAdminCount,
    getUserRisk,
};
