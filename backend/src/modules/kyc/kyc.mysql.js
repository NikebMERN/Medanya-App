// src/modules/kyc/kyc.mysql.js
const { pool } = require("../../config/mysql");

async function insertSubmission({
    user_id,
    doc_type,
    doc_hash,
    last4,
    cloudinary_url_private,
    selfie_image_url = null,
    status = "pending",
}) {
    const [result] = await pool.query(
        `INSERT INTO kyc_submissions (user_id, doc_type, doc_hash, last4, cloudinary_url_private, selfie_image_url, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [user_id, doc_type, doc_hash || null, last4 || null, cloudinary_url_private || null, selfie_image_url || null, status],
    );
    return result.insertId;
}

async function findById(id) {
    const [rows] = await pool.query(
        `SELECT * FROM kyc_submissions WHERE id = ? LIMIT 1`,
        [id],
    );
    return rows[0] || null;
}

async function findLatestByUserId(userId) {
    const [rows] = await pool.query(
        `SELECT * FROM kyc_submissions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
        [userId],
    );
    return rows[0] || null;
}

async function findByUserId(userId) {
    const [rows] = await pool.query(
        `SELECT * FROM kyc_submissions WHERE user_id = ? ORDER BY created_at DESC`,
        [userId],
    );
    return rows;
}

async function updateById(id, fields) {
    const allowed = [
        "status",
        "reviewed_by",
        "reviewed_at",
        "reject_reason",
        "retention_delete_at",
    ];
    const set = [];
    const params = [];

    for (const key of allowed) {
        if (fields[key] !== undefined) {
            set.push(`${key} = ?`);
            params.push(fields[key]);
        }
    }

    if (set.length === 0) return 0;

    const [result] = await pool.query(
        `UPDATE kyc_submissions SET ${set.join(", ")} WHERE id = ?`,
        [...params, id],
    );
    return result.affectedRows;
}

async function listByStatus(status, { page = 1, limit = 20 } = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (p - 1) * l;

    const where = status ? `WHERE status = ?` : "";
    const params = status ? [status, l, offset] : [l, offset];

    const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM kyc_submissions ${where}`,
        status ? [status] : [],
    );

    const [rows] = await pool.query(
        `SELECT k.*, u.display_name, u.phone_number
         FROM kyc_submissions k
         LEFT JOIN users u ON u.id = k.user_id
         ${where}
         ORDER BY k.created_at DESC
         LIMIT ? OFFSET ?`,
        params,
    );

    return { page: p, limit: l, total: countRow.total, submissions: rows };
}

module.exports = {
    insertSubmission,
    findById,
    findLatestByUserId,
    findByUserId,
    updateById,
    listByStatus,
};
