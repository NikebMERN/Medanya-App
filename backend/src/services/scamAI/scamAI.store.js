/**
 * Scam AI: persistence helper.
 * Store hashed content only; never raw sensitive text.
 */
const crypto = require("crypto");
const { pool } = require("../../config/mysql");
const logger = require("../../utils/logger.util");

const SALT = process.env.SCAM_AI_HASH_SALT || "medanya-scam-ai-salt-v1";

function hashContent(title, description, location) {
    const raw = [title || "", description || "", location || ""]
        .map((s) => String(s || "").trim().toLowerCase())
        .filter(Boolean)
        .join("|");
    if (!raw) return null;
    return crypto.createHmac("sha256", SALT).update(raw).digest("hex");
}

async function insertLog({ targetType, targetId, userId, contentHash, aiProvider, aiScore, aiLabels, aiConfidence, decision }) {
    try {
        await pool.query(
            `INSERT INTO scam_ai_logs (target_type, target_id, user_id, content_hash, ai_provider, ai_score, ai_labels, ai_confidence, decision, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                targetType || null,
                targetId || null,
                userId || null,
                contentHash || null,
                aiProvider || null,
                aiScore ?? null,
                aiLabels ? JSON.stringify(aiLabels) : null,
                aiConfidence ?? null,
                decision || null,
            ]
        );
    } catch (e) {
        logger.warn("scamAI.store: insertLog failed", e?.message);
    }
}

module.exports = { hashContent, insertLog };
