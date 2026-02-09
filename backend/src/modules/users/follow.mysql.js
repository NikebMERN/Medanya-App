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

async function discoverUsers(currentUserId, { page = 1, limit = 20, q = "" } = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const offset = (p - 1) * l;
    const searchQ = String(q || "").trim();
    const like = searchQ ? `%${searchQ}%` : null;
    let where = "u.is_active = 1 AND u.id != ?";
    const params = [currentUserId];
    if (like) {
        where += " AND (u.display_name LIKE ? OR u.phone_number LIKE ?)";
        params.push(like, like);
    }
    const countParams = [...params];
    params.push(currentUserId, l, offset);
    const [rows] = await pool.query(
        `SELECT u.id, u.display_name, u.avatar_url, u.neighborhood, u.role, u.is_verified,
                (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS follower_count,
                (SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id LIMIT 1) AS is_following
         FROM users u
         WHERE ${where}
         ORDER BY follower_count DESC, u.id DESC
         LIMIT ? OFFSET ?`,
        params,
    );
    const [[c]] = await pool.query(
        `SELECT COUNT(*) AS total FROM users u WHERE ${where}`,
        countParams,
    );
    const users = rows.map((u) => ({
        id: u.id,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
        neighborhood: u.neighborhood,
        role: u.role,
        is_verified: u.is_verified,
        isFollowing: !!u.is_following,
        followerCount: Number(u.follower_count) || 0,
    }));
    return { page: p, limit: l, total: c.total, users };
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
};
