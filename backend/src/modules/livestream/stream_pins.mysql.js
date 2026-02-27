// src/modules/livestream/stream_pins.mysql.js
const { pool } = require("../../config/mysql");

const FIELDS = "id, stream_id, listing_id, sort_order, created_at";

async function insertPin(conn, { stream_id, listing_id, sort_order }) {
    const [res] = await conn.query(
        `INSERT INTO stream_pins (stream_id, listing_id, sort_order) VALUES (?, ?, ?)`,
        [stream_id, listing_id, sort_order ?? 0],
    );
    return res.insertId;
}

async function getPinsByStreamId(connOrPool, streamId) {
    const [rows] = await connOrPool.query(
        `SELECT ${FIELDS} FROM stream_pins WHERE stream_id = ? ORDER BY sort_order ASC, created_at DESC`,
        [streamId],
    );
    return rows;
}

async function getMaxSortOrder(conn, streamId) {
    const [[row]] = await conn.query(
        `SELECT COALESCE(MAX(sort_order), 0) AS mx FROM stream_pins WHERE stream_id = ?`,
        [streamId],
    );
    return row?.mx ?? 0;
}

module.exports = {
    insertPin,
    getPinsByStreamId,
    getMaxSortOrder,
};
