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
    discoverUsers,
};
