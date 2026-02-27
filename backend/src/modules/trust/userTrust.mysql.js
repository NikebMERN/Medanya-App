const { pool } = require("../../config/mysql");

const DEFAULT_SCORE = 50;
const MIN_SCORE = 0;
const MAX_SCORE = 100;

async function getOrCreate(userId) {
    const [rows] = await pool.query(
        "SELECT * FROM user_trust WHERE user_id = ? LIMIT 1",
        [userId]
    );
    if (rows[0]) return rows[0];
    await pool.query(
        "INSERT IGNORE INTO user_trust (user_id, trust_score) VALUES (?, ?)",
        [userId, DEFAULT_SCORE]
    );
    const [r2] = await pool.query("SELECT * FROM user_trust WHERE user_id = ? LIMIT 1", [userId]);
    return r2[0] || { user_id: userId, trust_score: DEFAULT_SCORE };
}

async function updateTrustScore(userId, delta) {
    await getOrCreate(userId);
    const d = Number(delta) || 0;
    await pool.query(
        `UPDATE user_trust SET trust_score = LEAST(?, GREATEST(?, trust_score + ?)), updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
        [MAX_SCORE, MIN_SCORE, d, userId]
    );
    const [rows] = await pool.query("SELECT * FROM user_trust WHERE user_id = ? LIMIT 1", [userId]);
    return rows[0];
}

async function getTrustScore(userId) {
    const row = await getOrCreate(userId);
    return row ? Number(row.trust_score) : DEFAULT_SCORE;
}

module.exports = { getOrCreate, updateTrustScore, getTrustScore, DEFAULT_SCORE, MIN_SCORE, MAX_SCORE };
