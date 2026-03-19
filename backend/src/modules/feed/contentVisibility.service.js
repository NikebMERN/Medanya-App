// src/modules/feed/contentVisibility.service.js
// Centralizes exclusion of banned/hidden users from feed, live, and marketplace.
// Excluded: is_banned, inactive (is_active = 0). Apply to feed posts, marketplace in feed, live avatars.
const { pool } = require("../../config/mysql");

/** Returns Set of user IDs that must be excluded from feed (banned, inactive). Do not show their content in Feeds tab or Live section. */
async function getExcludedUserIds() {
    const [rows] = await pool.query(
        `SELECT id FROM users WHERE is_banned = 1 OR is_active = 0`
    );
    return new Set(rows.map((r) => String(r.id)));
}

/** Returns true if userId should be excluded from feed. */
async function isUserExcluded(userId) {
    if (!userId) return true;
    const [rows] = await pool.query(
        `SELECT 1 FROM users WHERE id = ? AND (is_banned = 1 OR is_active = 0) LIMIT 1`,
        [userId],
    );
    return rows.length > 0;
}

module.exports = {
    getExcludedUserIds,
    isUserExcluded,
};
