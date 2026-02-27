/**
 * Veriff webhook event storage for diagnostics.
 */
const { pool } = require("../../config/mysql");

async function insertEvent({ kind, sessionId, headersJson, payloadRaw, payloadJson, signatureValid, errorText }) {
    const [result] = await pool.query(
        `INSERT INTO veriff_webhook_events (kind, session_id, headers_json, payload_raw, payload_json, signature_valid, error_text)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            kind || null,
            sessionId || null,
            headersJson ? JSON.stringify(headersJson) : null,
            payloadRaw || null,
            payloadJson ? JSON.stringify(payloadJson) : null,
            signatureValid ? 1 : 0,
            errorText || null,
        ]
    );
    return result.insertId;
}

async function findLastBySessionId(sessionId) {
    const [rows] = await pool.query(
        "SELECT * FROM veriff_webhook_events WHERE session_id = ? ORDER BY received_at DESC LIMIT 1",
        [sessionId]
    );
    return rows[0] || null;
}

async function findRecentBySessionId(sessionId, limit = 10) {
    const [rows] = await pool.query(
        "SELECT * FROM veriff_webhook_events WHERE session_id = ? ORDER BY received_at DESC LIMIT ?",
        [sessionId, limit]
    );
    return rows || [];
}

async function findLast20BySessionId(sessionId) {
    const [rows] = await pool.query(
        "SELECT id, kind, session_id, received_at, headers_json, payload_raw, payload_json, signature_valid, error_text FROM veriff_webhook_events WHERE session_id = ? ORDER BY received_at DESC LIMIT 20",
        [sessionId]
    );
    return rows || [];
}

module.exports = {
    insertEvent,
    findLastBySessionId,
    findRecentBySessionId,
    findLast20BySessionId,
};
