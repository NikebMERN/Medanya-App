const { pool } = require("../../config/mysql");

async function insert(conn, row) {
    const [r] = await conn.query(
        `INSERT INTO penalties (user_id, level, reason_code, reason_text, evidence_refs, fine_amount_cents, status, ban_until, stripe_payment_intent_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            row.user_id,
            row.level ?? 1,
            row.reason_code ?? "OTHER",
            row.reason_text || null,
            row.evidence_refs ? JSON.stringify(row.evidence_refs) : null,
            row.fine_amount_cents ?? 0,
            row.status ?? "UNPAID",
            row.ban_until || null,
            row.stripe_payment_intent_id || null,
        ]
    );
    return r.insertId;
}

async function findById(connOrPool, id) {
    const [rows] = await connOrPool.query(
        `SELECT * FROM penalties WHERE id = ? LIMIT 1`,
        [id]
    );
    return rows[0] || null;
}

async function findByUserId(connOrPool, userId) {
    const [rows] = await connOrPool.query(
        `SELECT * FROM penalties WHERE user_id = ? ORDER BY created_at DESC`,
        [userId]
    );
    return rows;
}

async function updateStatus(conn, id, status, stripePaymentIntentId = null) {
    const updates = ["status = ?"];
    const params = [status];
    if (stripePaymentIntentId) {
        updates.push("stripe_payment_intent_id = ?");
        params.push(stripePaymentIntentId);
    }
    params.push(id);
    await conn.query(
        `UPDATE penalties SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`,
        params
    );
}

async function updateUserBan(conn, userId, isBanned, banUntil, activePenaltyId, bannedReason) {
    await conn.query(
        `UPDATE users SET is_banned = ?, ban_until = ?, active_penalty_id = ?, banned_reason = ? WHERE id = ?`,
        [isBanned ? 1 : 0, banUntil || null, activePenaltyId || null, bannedReason || null, userId]
    );
}

module.exports = {
    insert,
    findById,
    findByUserId,
    updateStatus,
    updateUserBan,
};
