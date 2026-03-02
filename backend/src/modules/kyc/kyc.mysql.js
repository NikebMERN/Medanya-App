// src/modules/kyc/kyc.mysql.js
const { pool } = require("../../config/mysql");

async function insertSubmission({
    user_id,
    doc_type,
    doc_hash,
    last4,
    doc_number_encrypted = null,
    cloudinary_url_private,
    selfie_image_url = null,
    full_name = null,
    birthdate = null,
    status = "pending",
}) {
    const [result] = await pool.query(
        `INSERT INTO kyc_submissions (user_id, doc_type, doc_hash, last4, doc_number_encrypted, cloudinary_url_private, selfie_image_url, full_name, birthdate, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [user_id, doc_type, doc_hash || null, last4 || null, doc_number_encrypted || null, cloudinary_url_private || null, selfie_image_url || null, full_name || null, birthdate || null, status],
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

async function countByDocHash(docHash, excludeUserId = null) {
    let sql = `SELECT COUNT(*) AS c FROM kyc_submissions WHERE doc_hash = ?`;
    const params = [docHash];
    if (excludeUserId != null) {
        sql += ` AND user_id != ?`;
        params.push(excludeUserId);
    }
    const [[row]] = await pool.query(sql, params);
    return row?.c ?? 0;
}

function normalizeLegalName(s) {
    if (!s || typeof s !== "string") return "";
    return s.trim().toLowerCase().replace(/\s+/g, " ");
}

async function countByLegalName(fullNameNormalized, excludeUserId = null) {
    if (!fullNameNormalized || fullNameNormalized.length < 3) return 0;
    const colNorm = "LOWER(TRIM(REPLACE(REPLACE(REPLACE(full_name, '  ', ' '), '  ', ' '), '  ', ' ')))";
    let sql = `SELECT COUNT(*) AS c FROM kyc_submissions WHERE full_name IS NOT NULL AND full_name != '' AND ${colNorm} = ?`;
    const params = [fullNameNormalized];
    if (excludeUserId != null) {
        sql += ` AND user_id != ?`;
        params.push(excludeUserId);
    }
    const [[row]] = await pool.query(sql, params);
    return row?.c ?? 0;
}

async function updateById(id, fields) {
    const allowed = [
        "status",
        "reviewed_by",
        "reviewed_at",
        "reject_reason",
        "retention_delete_at",
        "extracted_name",
        "extracted_dob",
        "face_match_score",
        "name_match_score",
        "doc_quality_ok",
        "doc_hash_duplicate",
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

    let where = "";
    let countParams = [];
    let listParams = [];
    if (status && status !== "all") {
        if (status === "pending_manual") {
            where = "WHERE status IN ('pending_manual', 'pending')";
        } else if (status === "verified") {
            where = "WHERE status IN ('verified_auto', 'verified_manual', 'verified')";
        } else if (status === "submitted") {
            where = "WHERE status IN ('pending_auto', 'pending_manual', 'pending')";
        } else if (status === "pending") {
            where = "WHERE status IN ('pending_manual', 'pending', 'pending_auto')";
        } else {
            where = "WHERE status = ?";
            countParams = [status];
            listParams = [status];
        }
    }
    listParams = [...listParams, l, offset];

    const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM kyc_submissions ${where}`,
        countParams,
    );

    const [rows] = await pool.query(
        `SELECT k.*, u.display_name, u.phone_number
         FROM kyc_submissions k
         LEFT JOIN users u ON u.id = k.user_id
         ${where}
         ORDER BY k.created_at DESC
         LIMIT ? OFFSET ?`,
        listParams,
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
    countByDocHash,
    countByLegalName,
    normalizeLegalName,
};
