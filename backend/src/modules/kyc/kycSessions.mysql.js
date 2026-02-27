/**
 * KYC sessions for provider (Sumsub/Veriff) flow.
 */
const { pool } = require("../../config/mysql");

async function insertSession({ userId, provider, providerApplicantId, providerSessionId, providerExternalId, sessionUrl, status = "CREATED" }) {
    const [result] = await pool.query(
        `INSERT INTO kyc_sessions (user_id, provider, provider_applicant_id, provider_session_id, provider_external_id, session_url, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, provider, providerApplicantId || null, providerSessionId || null, providerExternalId || null, sessionUrl || null, status]
    );
    return result.insertId;
}

async function findByProviderSessionId(provider, providerSessionId) {
    const [rows] = await pool.query(
        "SELECT * FROM kyc_sessions WHERE provider = ? AND provider_session_id = ? LIMIT 1",
        [provider, providerSessionId]
    );
    return rows[0] || null;
}

async function findByProviderApplicantId(provider, providerApplicantId) {
    const [rows] = await pool.query(
        "SELECT * FROM kyc_sessions WHERE provider = ? AND provider_applicant_id = ? ORDER BY id DESC LIMIT 1",
        [provider, providerApplicantId]
    );
    return rows[0] || null;
}

async function findLatestByUserId(provider, userId) {
    const [rows] = await pool.query(
        "SELECT * FROM kyc_sessions WHERE provider = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1",
        [provider, userId]
    );
    return rows[0] || null;
}

async function findByProviderExternalId(provider, externalId) {
    const [rows] = await pool.query(
        "SELECT * FROM kyc_sessions WHERE provider = ? AND provider_external_id = ? ORDER BY id DESC LIMIT 1",
        [provider, externalId]
    );
    return rows[0] || null;
}

async function updateSession(id, updates) {
    const fields = [];
    const values = [];
    if (updates.status != null) { fields.push("status = ?"); values.push(updates.status); }
    if (updates.reason_code != null) { fields.push("reason_code = ?"); values.push(updates.reason_code); }
    if (updates.reason != null) { fields.push("reason = ?"); values.push(updates.reason); }
    if (updates.reject_labels != null) { fields.push("reject_labels = ?"); values.push(JSON.stringify(updates.reject_labels)); }
    if (updates.reject_reason_summary != null) { fields.push("reject_reason_summary = ?"); values.push(updates.reject_reason_summary); }
    if (updates.last_decision_poll_at != null) { fields.push("last_decision_poll_at = ?"); values.push(updates.last_decision_poll_at); }
    if (updates.last_decision_poll_result != null) { fields.push("last_decision_poll_result = ?"); values.push(JSON.stringify(updates.last_decision_poll_result)); }
    if (fields.length === 0) return null;
    values.push(id);
    await pool.query(
        `UPDATE kyc_sessions SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
    );
    const [rows] = await pool.query("SELECT * FROM kyc_sessions WHERE id = ?", [id]);
    return rows[0] || null;
}

async function listSessions({ status, provider, page = 1, limit = 50 } = {}) {
    const offset = (Math.max(1, page) - 1) * Math.min(limit, 100);
    let where = "1=1";
    const params = [];
    if (status) { where += " AND s.status = ?"; params.push(status); }
    if (provider) { where += " AND s.provider = ?"; params.push(provider); }
    params.push(limit, offset);
    const [rows] = await pool.query(
        `SELECT s.*, u.display_name, u.phone_number FROM kyc_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE ${where} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
        params
    );
    const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total FROM kyc_sessions s WHERE ${where}`,
        params.slice(0, -2)
    );
    return { sessions: rows, total: total || 0 };
}

module.exports = {
    insertSession,
    findByProviderSessionId,
    findByProviderApplicantId,
    findByProviderExternalId,
    findLatestByUserId,
    updateSession,
    listSessions,
};
