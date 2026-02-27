// src/modules/videos/video_pins.mysql.js
const { pool } = require("../../config/mysql");

const FIELDS = "id, video_id, listing_id, user_id, sort_order, created_at";

async function insertPin(conn, { video_id, listing_id, user_id, sort_order }) {
    const [res] = await conn.query(
        `INSERT INTO video_pins (video_id, listing_id, user_id, sort_order) VALUES (?, ?, ?, ?)`,
        [video_id, listing_id, user_id, sort_order ?? 0],
    );
    return res.insertId;
}

async function getPinsByVideoId(connOrPool, videoId) {
    const [rows] = await connOrPool.query(
        `SELECT ${FIELDS} FROM video_pins WHERE video_id = ? ORDER BY sort_order ASC, created_at DESC`,
        [videoId],
    );
    return rows;
}

async function getMaxSortOrder(conn, videoId) {
    const [[row]] = await conn.query(
        `SELECT COALESCE(MAX(sort_order), 0) AS mx FROM video_pins WHERE video_id = ?`,
        [videoId],
    );
    return row?.mx ?? 0;
}

module.exports = {
    insertPin,
    getPinsByVideoId,
    getMaxSortOrder,
};
