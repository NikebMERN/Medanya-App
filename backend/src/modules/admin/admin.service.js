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
        { $sort: { createdAt: 1 } },
        {
            $group: {
                _id: "$targetId",
                reportCount: { $sum: 1 },
                reasons: { $push: "$reason" },
                latestAt: { $max: "$createdAt" },
                latestReason: { $last: "$reason" },
                latestCustomReason: { $last: "$customReason" },
                latestDescription: { $last: "$description" },
                latestContextSourceUrl: { $last: "$contextSourceUrl" },
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

    const reportedUsers = await Promise.all(
        agg.map(async (a) => {
            const u = userMap[a._id] || {};
            const reportsCount = a.reportCount || 0;
            const bars = await computeUserRiskScore(u, reportsCount);
            const riskLabel = getRiskLabel(bars);
            const latestReason =
                a.latestReason === "other" && a.latestCustomReason
                    ? a.latestCustomReason
                    : a.latestReason;
            return {
                ...u,
                reportCount: a.reportCount,
                latestReportAt: a.latestAt,
                latestReason,
                latestDescription: a.latestDescription,
                latestContextSourceUrl: a.latestContextSourceUrl || "",
                reporterIds: a.reporterIds || [],
                risk_score: bars,
                risk_label: riskLabel,
            };
        }),
    );

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

const activityService = require("../activity/activity.service");
const chatService = require("../chats/chat.service");
const userDb = require("../users/user.mysql");
const Chat = require("../chats/chat.model");
const Video = require("../videos/video.model");
const Stream = require("../livestream/stream.model");

const getUserFullData = async (userId) => {
    const uid = String(userId);
    const user = await userDb.getById(userId, { forSelf: true });
    if (!user) return null;

    const [
        jobsRows,
        marketplaceRows,
        jobAppsRows,
        deviceRows,
        frRequesterRows,
        frTargetRows,
        kycRows,
        reportsAgainst,
        reportsBy,
        activities,
        chats,
        videos,
        streams,
        riskData,
    ] = await Promise.all([
        pool.query("SELECT * FROM jobs WHERE created_by = ? ORDER BY created_at DESC LIMIT 100", [uid]),
        pool.query("SELECT * FROM marketplace_items WHERE seller_id = ? ORDER BY created_at DESC LIMIT 100", [uid]),
        pool.query("SELECT ja.*, j.title as job_title FROM job_applications ja LEFT JOIN jobs j ON j.id = ja.job_id WHERE ja.applicant_id = ? ORDER BY ja.created_at DESC LIMIT 100", [uid]),
        pool.query("SELECT * FROM user_device_tokens WHERE user_id = ?", [uid]).catch(() => [[], []]),
        pool.query("SELECT * FROM follow_requests WHERE requester_id = ?", [uid]).catch(() => [[], []]),
        pool.query("SELECT * FROM follow_requests WHERE target_id = ?", [uid]).catch(() => [[], []]),
        pool.query("SELECT id, user_id, doc_type, status, reviewed_at, created_at FROM kyc_submissions WHERE user_id = ? ORDER BY created_at DESC", [uid]).catch(() => [[], []]),
        ListingReport.find({ targetType: "user", targetId: uid }).sort({ createdAt: -1 }).limit(50).lean(),
        ListingReport.find({ reporterId: uid }).sort({ createdAt: -1 }).limit(50).lean(),
        activityService.getRecentActivities(uid, 60 * 24 * 7, 100),
        Chat.find({ participants: uid }).limit(50).lean(),
        Video.find({ $or: [{ uploaderId: uid }, { createdBy: uid }] }).sort({ createdAt: -1 }).limit(50).lean(),
        Stream.find({ hostId: uid }).sort({ startedAt: -1 }).limit(50).lean(),
        getUserRisk(uid),
    ]);

    const [followsFollowerRows, followsFollowingRows, blocksByRows, blockedByRows] = await Promise.all([
        pool.query("SELECT f.*, u.display_name as following_name FROM follows f JOIN users u ON u.id = f.following_id WHERE f.follower_id = ? LIMIT 100", [uid]),
        pool.query("SELECT f.*, u.display_name as follower_name FROM follows f JOIN users u ON u.id = f.follower_id WHERE f.following_id = ? LIMIT 100", [uid]),
        pool.query("SELECT * FROM user_blocks WHERE blocker_id = ?", [uid]).catch(() => [[], []]),
        pool.query("SELECT * FROM user_blocks WHERE blocked_id = ?", [uid]).catch(() => [[], []]),
    ]);

    return {
        mysql: {
            user,
            jobs: jobsRows[0] || [],
            marketplaceItems: marketplaceRows[0] || [],
            jobApplications: jobAppsRows[0] || [],
            deviceTokens: deviceRows[0] || [],
            followRequestsAsRequester: frRequesterRows[0] || [],
            followRequestsAsTarget: frTargetRows[0] || [],
            kycSubmissions: kycRows[0] || [],
            followsAsFollower: followsFollowerRows[0] || [],
            followsAsFollowing: followsFollowingRows[0] || [],
            blocksByUser: blocksByRows[0] || [],
            blockedByOthers: blockedByRows[0] || [],
        },
        mongo: {
            reportsAgainst: reportsAgainst || [],
            reportsBy: reportsBy || [],
            activities: activities || [],
            chats: chats || [],
            videos: videos || [],
            streams: streams || [],
        },
        risk: riskData,
    };
};

const markUserSafe = async (userId) => {
    const uid = String(userId);
    const result = await ListingReport.deleteMany({
        targetType: "user",
        targetId: uid,
    });
    return { deleted: result.deletedCount ?? 0 };
};

const getReportContext = async (reportedUserId, reporterId) => {
    const reported = String(reportedUserId);
    const reporter = reporterId ? String(reporterId) : null;
    const [activities, chatMessages] = await Promise.all([
        activityService.getRecentActivities(reported, 20, 50),
        reporter
            ? chatService.getMessagesBetweenUsersForAdmin(reporter, reported, 100)
            : Promise.resolve([]),
    ]);
    return {
        activities,
        chatMessages,
    };
};

module.exports = {
    listUsers,
    listReportedUsers,
    markUserSafe,
    getUserFullData,
    getReportContext,
    setUserRole,
    banUser,
    getAdminCount,
    getUserRisk,
};
