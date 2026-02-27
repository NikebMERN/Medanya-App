/**
 * Scam ML: training sample persistence.
 */
const { pool } = require("../../config/mysql");

function normalizeText(title, description, location) {
    return [title || "", description || "", location || ""].map((s) => String(s || "").trim()).filter(Boolean).join(" ").slice(0, 50000) || "";
}

async function insertSample({ targetType, targetId, userId, text, lang, weakLabel, labelSource }) {
    const [r] = await pool.query(
        `INSERT INTO scam_training_samples (target_type, target_id, user_id, text, lang, weak_label, label_source)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE text = VALUES(text), weak_label = VALUES(weak_label), label_source = VALUES(label_source), updated_at = NOW()`,
        [targetType, targetId || null, userId || null, text || "", lang || null, weakLabel || "UNKNOWN", labelSource || null]
    );
    return r.insertId || r.affectedRows;
}

async function updateFinalLabel(targetType, targetId, finalLabel, labelSource) {
    const [r] = await pool.query(
        `UPDATE scam_training_samples SET final_label = ?, label_source = ?, updated_at = NOW() WHERE target_type = ? AND target_id = ?`,
        [finalLabel, labelSource, targetType, targetId]
    );
    return r.affectedRows;
}

async function getLabeledCount() {
    const [[row]] = await pool.query(
        `SELECT COUNT(*) AS total FROM scam_training_samples WHERE final_label IN ('SCAM','LEGIT')`
    );
    return row?.total ?? 0;
}

async function getLabeledSamples(limit = 10000) {
    const [rows] = await pool.query(
        `SELECT id, target_type, target_id, text, final_label, label_source FROM scam_training_samples WHERE final_label IN ('SCAM','LEGIT') ORDER BY updated_at DESC LIMIT ?`,
        [limit]
    );
    return rows;
}

async function listSamplesNeedingLabel(limit = 50) {
    const [rows] = await pool.query(
        `SELECT id, target_type, target_id, LEFT(text, 200) AS text_preview FROM scam_training_samples WHERE final_label IS NULL ORDER BY created_at DESC LIMIT ?`,
        [limit]
    );
    return rows;
}

async function updateLabelById(sampleId, finalLabel, labelSource = "ADMIN") {
    const [r] = await pool.query(
        `UPDATE scam_training_samples SET final_label = ?, label_source = ?, updated_at = NOW() WHERE id = ?`,
        [finalLabel, labelSource, sampleId]
    );
    return r.affectedRows;
}

async function findSampleByTarget(targetType, targetId) {
    const [rows] = await pool.query(
        `SELECT * FROM scam_training_samples WHERE target_type = ? AND target_id = ? LIMIT 1`,
        [targetType, targetId]
    );
    return rows[0] || null;
}

module.exports = {
    normalizeText,
    insertSample,
    updateFinalLabel,
    updateLabelById,
    getLabeledCount,
    getLabeledSamples,
    listSamplesNeedingLabel,
    findSampleByTarget,
};
