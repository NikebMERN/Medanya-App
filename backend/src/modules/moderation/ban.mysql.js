const { pool } = require("../../config/mysql");

async function insertBan({ type, value_hash, reason }) {
    const [result] = await pool.query(
        `INSERT INTO bans (type, value_hash, reason) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE reason = VALUES(reason), created_at = CURRENT_TIMESTAMP`,
        [type, value_hash, reason || null],
    );
    return result.insertId || result.affectedRows;
}

async function findByTypeAndHash(type, valueHash) {
    const [rows] = await pool.query(
        `SELECT * FROM bans WHERE type = ? AND value_hash = ? LIMIT 1`,
        [type, valueHash],
    );
    return rows[0] || null;
}

async function isBanned(type, valueHash) {
    const row = await findByTypeAndHash(type, valueHash);
    return !!row;
}

async function removeBan(type, valueHash) {
    const [result] = await pool.query(
        `DELETE FROM bans WHERE type = ? AND value_hash = ?`,
        [type, valueHash],
    );
    return result.affectedRows > 0;
}

module.exports = {
    insertBan,
    findByTypeAndHash,
    isBanned,
    removeBan,
};
