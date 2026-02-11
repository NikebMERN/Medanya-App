// src/modules/users/follow.mysql.js
const { pool } = require("../../config/mysql");

async function follow(followerId, followingId) {
    const [result] = await pool.query(
        `INSERT IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)`,
        [followerId, followingId],
    );
    return result.affectedRows > 0;
}

async function unfollow(followerId, followingId) {
    const [result] = await pool.query(
        `DELETE FROM follows WHERE follower_id = ? AND following_id = ?`,
        [followerId, followingId],
    );
    return result.affectedRows > 0;
}

async function isFollowing(followerId, followingId) {
    const [rows] = await pool.query(
        `SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? LIMIT 1`,
        [followerId, followingId],
    );
    return rows.length > 0;
}

async function countFollowers(userId) {
    const [[r]] = await pool.query(
        `SELECT COUNT(*) AS c FROM follows WHERE following_id = ?`,
        [userId],
    );
    return r?.c || 0;
}

async function countFollowing(userId) {
    const [[r]] = await pool.query(
        `SELECT COUNT(*) AS c FROM follows WHERE follower_id = ?`,
        [userId],
    );
    return r?.c || 0;
}

async function listFollowers(userId, { page = 1, limit = 50 } = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const offset = (p - 1) * l;
    const [rows] = await pool.query(
        `SELECT u.id, u.display_name, u.avatar_url, u.role, u.is_verified, f.created_at AS followed_at
         FROM follows f
         JOIN users u ON u.id = f.follower_id
         WHERE f.following_id = ? AND u.is_active = 1
         ORDER BY f.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, l, offset],
    );
    const [[c]] = await pool.query(`SELECT COUNT(*) AS total FROM follows WHERE following_id = ?`, [userId]);
    return { page: p, limit: l, total: c.total, users: rows };
}

async function listFollowing(userId, { page = 1, limit = 50 } = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const offset = (p - 1) * l;
    const [rows] = await pool.query(
        `SELECT u.id, u.display_name, u.avatar_url, u.role, u.is_verified, f.created_at AS followed_at
         FROM follows f
         JOIN users u ON u.id = f.following_id
         WHERE f.follower_id = ? AND u.is_active = 1
         ORDER BY f.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, l, offset],
    );
    const [[c]] = await pool.query(`SELECT COUNT(*) AS total FROM follows WHERE follower_id = ?`, [userId]);
    return { page: p, limit: l, total: c.total, users: rows };
}

// Follow requests (for private accounts)
async function createFollowRequest(requesterId, targetId) {
    const [result] = await pool.query(
        `INSERT INTO follow_requests (requester_id, target_id, status) VALUES (?, ?, 'pending')
         ON DUPLICATE KEY UPDATE status = 'pending', created_at = CURRENT_TIMESTAMP`,
        [requesterId, targetId],
    );
    return result.affectedRows > 0 || result.insertId > 0;
}

async function getPendingRequest(requesterId, targetId) {
    const [rows] = await pool.query(
        `SELECT id, status FROM follow_requests WHERE requester_id = ? AND target_id = ? AND status = 'pending' LIMIT 1`,
        [requesterId, targetId],
    );
    return rows[0] || null;
}

async function acceptFollowRequest(targetId, requesterId) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query(
            `INSERT IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)`,
            [requesterId, targetId],
        );
        const [r] = await conn.query(
            `UPDATE follow_requests SET status = 'accepted' WHERE target_id = ? AND requester_id = ? AND status = 'pending'`,
            [targetId, requesterId],
        );
        await conn.commit();
        return r.affectedRows > 0;
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

async function rejectFollowRequest(targetId, requesterId) {
    const [r] = await pool.query(
        `UPDATE follow_requests SET status = 'rejected' WHERE target_id = ? AND requester_id = ? AND status = 'pending'`,
        [targetId, requesterId],
    );
    return r.affectedRows > 0;
}

async function listPendingRequestsForUser(targetId) {
    const [rows] = await pool.query(
        `SELECT fr.id, fr.requester_id, fr.created_at, u.display_name, u.avatar_url, u.is_verified
         FROM follow_requests fr
         JOIN users u ON u.id = fr.requester_id
         WHERE fr.target_id = ? AND fr.status = 'pending' AND u.is_active = 1
         ORDER BY fr.created_at DESC`,
        [targetId],
    );
    return rows;
}

async function getFollowRequestById(requestId, targetId) {
    const [rows] = await pool.query(
        `SELECT id, requester_id, target_id, status FROM follow_requests WHERE id = ? AND target_id = ? AND status = 'pending' LIMIT 1`,
        [requestId, targetId],
    );
    return rows[0] || null;
}

// ER_NO_SUCH_TABLE = 1146 (user_blocks may not exist yet)
const ER_NO_SUCH_TABLE = 1146;

async function discoverUsers(currentUserId, { page = 1, limit = 20, q = "" } = {}) {
    const me = String(currentUserId == null ? "" : currentUserId);
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200);
    const offset = (p - 1) * l;
    const searchQ = String(q || "").trim();
    const like = searchQ ? `%${searchQ}%` : null;

    const runQuery = (whereClause, mainParams) => {
        const mainParamsCopy = [...mainParams];
        mainParamsCopy.push(me, me, l, offset);
        const sql = `SELECT u.id, u.display_name, u.avatar_url, u.neighborhood, u.role, u.is_verified, u.account_private,
                (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS follower_count,
                (SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id LIMIT 1) AS is_following,
                (SELECT 1 FROM follows WHERE follower_id = u.id AND following_id = ? LIMIT 1) AS follows_me
         FROM users u
         WHERE ${whereClause}
         ORDER BY follower_count DESC, u.id DESC
         LIMIT ? OFFSET ?`;
        return pool.query(sql, mainParamsCopy).then(([rows]) => rows);
    };

    const runCount = (whereClause, countParams) => {
        return pool.query(`SELECT COUNT(*) AS total FROM users u WHERE ${whereClause}`, countParams)
            .then(([rows]) => (rows[0] ? Number(rows[0].total) : 0));
    };

    // Build WHERE with block exclusion (requires user_blocks table)
    let whereWithBlocks = "u.is_active = 1 AND u.id != ?";
    const paramsWithBlocks = [me];
    whereWithBlocks += " AND u.id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = ?)";
    paramsWithBlocks.push(me);
    whereWithBlocks += " AND u.id NOT IN (SELECT blocker_id FROM user_blocks WHERE blocked_id = ?)";
    paramsWithBlocks.push(me);
    if (like) {
        whereWithBlocks += " AND (u.display_name LIKE ? OR u.phone_number LIKE ?)";
        paramsWithBlocks.push(like, like);
    }

    // Build WHERE without block exclusion (fallback when user_blocks missing)
    let whereNoBlocks = "u.is_active = 1 AND u.id != ?";
    const paramsNoBlocks = [me];
    if (like) {
        whereNoBlocks += " AND (u.display_name LIKE ? OR u.phone_number LIKE ?)";
        paramsNoBlocks.push(like, like);
    }

    let rows;
    let total;

    try {
        rows = await runQuery(whereWithBlocks, paramsWithBlocks);
        total = await runCount(whereWithBlocks, paramsWithBlocks);
    } catch (err) {
        if (err.errno === ER_NO_SUCH_TABLE) {
            rows = await runQuery(whereNoBlocks, paramsNoBlocks);
            total = await runCount(whereNoBlocks, paramsNoBlocks);
        } else {
            throw err;
        }
    }

    const users = rows.map((u) => ({
        id: String(u.id),
        display_name: u.display_name,
        avatar_url: u.avatar_url,
        neighborhood: u.neighborhood,
        role: u.role,
        is_verified: u.is_verified,
        account_private: !!u.account_private,
        isFollowing: !!u.is_following,
        followsMe: !!u.follows_me,
        followerCount: Number(u.follower_count) || 0,
    }));
    return { page: p, limit: l, total, users };
}

// --- User blocks (blacklist) ---
async function block(blockerId, blockedId) {
    const [result] = await pool.query(
        `INSERT IGNORE INTO user_blocks (blocker_id, blocked_id) VALUES (?, ?)`,
        [blockerId, blockedId],
    );
    return result.affectedRows > 0;
}

async function unblock(blockerId, blockedId) {
    const [result] = await pool.query(
        `DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?`,
        [blockerId, blockedId],
    );
    return result.affectedRows > 0;
}

async function isBlocked(blockerId, blockedId) {
    const [rows] = await pool.query(
        `SELECT 1 FROM user_blocks WHERE blocker_id = ? AND blocked_id = ? LIMIT 1`,
        [blockerId, blockedId],
    );
    return rows.length > 0;
}

async function listBlocked(blockerId, { page = 1, limit = 50 } = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const offset = (p - 1) * l;
    const [rows] = await pool.query(
        `SELECT u.id, u.display_name, u.avatar_url, u.role, u.is_verified, b.created_at AS blocked_at
         FROM user_blocks b
         JOIN users u ON u.id = b.blocked_id
         WHERE b.blocker_id = ? AND u.is_active = 1
         ORDER BY b.created_at DESC
         LIMIT ? OFFSET ?`,
        [blockerId, l, offset],
    );
    const [[c]] = await pool.query(`SELECT COUNT(*) AS total FROM user_blocks WHERE blocker_id = ?`, [blockerId]);
    return { page: p, limit: l, total: c.total, users: rows };
}

module.exports = {
    follow,
    unfollow,
    isFollowing,
    countFollowers,
    countFollowing,
    listFollowers,
    listFollowing,
    createFollowRequest,
    getPendingRequest,
    getFollowRequestById,
    acceptFollowRequest,
    rejectFollowRequest,
    listPendingRequestsForUser,
    discoverUsers,
    block,
    unblock,
    isBlocked,
    listBlocked,
};
