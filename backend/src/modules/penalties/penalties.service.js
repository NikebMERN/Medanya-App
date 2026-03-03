const penaltiesDb = require("./penalties.mysql");
const { pool } = require("../../config/mysql");

const REASON_CODES = ["SCAM", "ABUSE", "GORE", "SEXUAL", "FRAUD", "HATE", "SPAM", "OTHER"];
const LEVELS = {
    1: { banHours: 0, label: "Warning" },
    2: { banHours: 24, label: "24h ban" },
    3: { banHours: 24 * 7, label: "7d ban" },
    4: { banHours: 24 * 30, label: "30d ban" },
    5: { banHours: null, label: "Permanent" },
};

function codeErr(code, message) {
    const e = new Error(message || code);
    e.code = code;
    return e;
}

function toId(u) {
    return String(u?.id ?? u?.userId ?? "");
}

async function listMyPenalties(user) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");
    const rows = await penaltiesDb.findByUserId(pool, userId);
    return rows.map((r) => ({
        id: r.id,
        level: r.level,
        reason_code: r.reason_code,
        reason_text: r.reason_text,
        fine_amount_cents: r.fine_amount_cents,
        status: r.status,
        ban_until: r.ban_until,
        created_at: r.created_at,
        level_label: LEVELS[r.level]?.label ?? `Level ${r.level}`,
    }));
}

async function getPenalty(user, penaltyId) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");
    const p = await penaltiesDb.findById(pool, penaltyId);
    if (!p) throw codeErr("NOT_FOUND", "Penalty not found");
    if (String(p.user_id) !== userId) throw codeErr("FORBIDDEN", "Not your penalty");
    return {
        id: p.id,
        level: p.level,
        reason_code: p.reason_code,
        reason_text: p.reason_text,
        evidence_refs: p.evidence_refs,
        fine_amount_cents: p.fine_amount_cents,
        status: p.status,
        ban_until: p.ban_until,
        created_at: p.created_at,
        level_label: LEVELS[p.level]?.label ?? `Level ${p.level}`,
    };
}

async function createPaymentIntent(user, penaltyId) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");
    const p = await penaltiesDb.findById(pool, penaltyId);
    if (!p) throw codeErr("NOT_FOUND", "Penalty not found");
    if (String(p.user_id) !== userId) throw codeErr("FORBIDDEN", "Not your penalty");
    if (p.status !== "UNPAID") throw codeErr("BAD_STATE", "Penalty already paid or waived");
    if ((p.fine_amount_cents || 0) <= 0) throw codeErr("BAD_STATE", "No fine to pay");

    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
    const pi = await stripe.paymentIntents.create({
        amount: p.fine_amount_cents,
        currency: "aed",
        automatic_payment_methods: { enabled: true },
        metadata: { type: "penalty", penaltyId: String(penaltyId), userId },
    });

    await pool.query(
        `UPDATE penalties SET stripe_payment_intent_id = ? WHERE id = ?`,
        [pi.id, penaltyId]
    );

    return { clientSecret: pi.client_secret };
}

/** Called by Stripe webhook on payment_intent.succeeded */
async function onPenaltyPaymentSucceeded(penaltyId) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const p = await penaltiesDb.findById(conn, penaltyId);
        if (!p || p.status !== "UNPAID") {
            await conn.rollback();
            return { ok: false, reason: "already_processed" };
        }
        await penaltiesDb.updateStatus(conn, penaltyId, "PAID");
        await penaltiesDb.updateUserBan(conn, p.user_id, 0, null, null, null);
        await conn.commit();
        return { ok: true };
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

/** Admin: create penalty and ban user */
async function adminCreatePenalty(adminUser, { userId, level, reasonCode, reasonText, fineAmountCents }) {
    const uid = toId(userId);
    if (!uid) throw codeErr("VALIDATION_ERROR", "userId required");
    const lvl = Math.min(5, Math.max(1, parseInt(level, 10) || 1));
    const reason = REASON_CODES.includes(reasonCode) ? reasonCode : "OTHER";
    const fine = Math.max(0, parseInt(fineAmountCents, 10) || 0);

    let banUntil = null;
    if (lvl >= 2 && lvl <= 4 && LEVELS[lvl].banHours) {
        const d = new Date();
        d.setHours(d.getHours() + LEVELS[lvl].banHours);
        banUntil = d;
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [r] = await conn.query(
            `INSERT INTO penalties (user_id, level, reason_code, reason_text, fine_amount_cents, status, ban_until)
             VALUES (?, ?, ?, ?, ?, 'UNPAID', ?)`,
            [uid, lvl, reason, reasonText || null, fine, banUntil]
        );
        const penaltyId = r.insertId;
        await penaltiesDb.updateUserBan(conn, uid, 1, banUntil, penaltyId, reasonText || `Penalty level ${lvl}`);
        await conn.commit();
        return penaltiesDb.findById(pool, penaltyId);
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

module.exports = {
    listMyPenalties,
    getPenalty,
    createPaymentIntent,
    onPenaltyPaymentSucceeded,
    adminCreatePenalty,
};
