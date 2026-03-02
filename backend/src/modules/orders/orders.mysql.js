// src/modules/orders/orders.mysql.js
const { pool } = require("../../config/mysql");

async function insertOrder(conn, order) {
    const [res] = await conn.query(
        `INSERT INTO orders (
            buyer_id, seller_id, listing_id, qty, total_cents, commission_cents,
            status, payment_method, stripe_payment_intent_id, delivery_code_hash,
            delivery_code_sent_at, delivery_code_encrypted, address_json,
            cod_deposit_cents, cod_cash_due_cents, payout_mode, payout_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            order.buyer_id,
            order.seller_id,
            order.listing_id,
            order.qty,
            order.total_cents,
            order.commission_cents,
            order.status,
            order.payment_method,
            order.stripe_payment_intent_id || null,
            order.delivery_code_hash || null,
            order.delivery_code_sent_at || null,
            order.delivery_code_encrypted || null,
            order.address_json ? JSON.stringify(order.address_json) : null,
            order.cod_deposit_cents ?? null,
            order.cod_cash_due_cents ?? null,
            order.payout_mode || "STRIPE_CONNECT",
            order.payout_status || "NONE",
        ],
    );
    return res.insertId;
}

async function findById(connOrPool, id) {
    const [rows] = await connOrPool.query(
        `SELECT * FROM orders WHERE id = ? LIMIT 1`,
        [id],
    );
    if (!rows[0]) return null;
    const r = rows[0];
    let address_json = null;
    if (r.address_json) {
        try {
            address_json = typeof r.address_json === "string" ? JSON.parse(r.address_json) : r.address_json;
        } catch (_) {}
    }
    return { ...r, address_json };
}

async function updateStatus(conn, id, status) {
    const [res] = await conn.query(`UPDATE orders SET status = ? WHERE id = ?`, [status, id]);
    return res.affectedRows;
}

async function updatePayoutStatus(conn, id, payoutStatus, payoutTransferId = null, payoutError = null) {
    const [res] = await conn.query(
        `UPDATE orders SET payout_status = ?, payout_transfer_id = COALESCE(?, payout_transfer_id), payout_error = ? WHERE id = ?`,
        [payoutStatus, payoutTransferId, payoutError, id]
    );
    return res.affectedRows;
}

async function listPendingPayouts(connOrPool, limit = 50) {
    const [rows] = await connOrPool.query(
        `SELECT id, seller_id, total_cents, commission_cents, payment_method, cod_deposit_cents, payout_status
         FROM orders WHERE payout_status = 'PENDING' AND status = 'COMPLETED' LIMIT ?`,
        [limit]
    );
    return rows;
}

async function updateStripePaymentIntent(conn, id, stripePaymentIntentId) {
    const [res] = await conn.query(
        `UPDATE orders SET stripe_payment_intent_id = ?, status = 'AUTHORIZED' WHERE id = ?`,
        [stripePaymentIntentId, id],
    );
    return res.affectedRows;
}

async function setDeliveryCode(conn, id, deliveryCodeHash, sentAt) {
    const [res] = await conn.query(
        `UPDATE orders SET delivery_code_hash = ?, delivery_code_sent_at = ? WHERE id = ?`,
        [deliveryCodeHash, sentAt, id],
    );
    return res.affectedRows;
}

async function listByBuyer(connOrPool, buyerId, { page = 1, limit = 20 } = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const offset = (p - 1) * l;
    const [rows] = await connOrPool.query(
        `SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [buyerId, l, offset],
    );
    const [[countRow]] = await connOrPool.query(`SELECT COUNT(*) AS total FROM orders WHERE buyer_id = ?`, [buyerId]);
    return { page: p, limit: l, total: countRow.total, orders: rows };
}

async function listBySeller(connOrPool, sellerId, { page = 1, limit = 20 } = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const offset = (p - 1) * l;
    const [rows] = await connOrPool.query(
        `SELECT * FROM orders WHERE seller_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [sellerId, l, offset],
    );
    const [[countRow]] = await connOrPool.query(`SELECT COUNT(*) AS total FROM orders WHERE seller_id = ?`, [sellerId]);
    return { page: p, limit: l, total: countRow.total, orders: rows };
}

async function listAll(connOrPool, { status, page = 1, limit = 20 } = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (p - 1) * l;
    let where = "1=1";
    const params = [];
    if (status) {
        where += " AND status = ?";
        params.push(status);
    }
    params.push(l, offset);
    const [rows] = await connOrPool.query(
        `SELECT * FROM orders WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        params,
    );
    const [[countRow]] = await connOrPool.query(
        `SELECT COUNT(*) AS total FROM orders WHERE ${where}`,
        params.slice(0, -2),
    );
    return { page: p, limit: l, total: countRow.total, orders: rows };
}

async function updateProposeDeliveryFee(conn, id, proposedDeliveryFeeCents) {
    const [res] = await conn.query(
        `UPDATE orders SET proposed_delivery_fee_cents = ?, proposed_delivery_fee_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [proposedDeliveryFeeCents, id],
    );
    return res.affectedRows;
}

async function updateAcceptDeliveryFee(conn, id) {
    const [res] = await conn.query(
        `UPDATE orders SET
            delivery_fee_cents = COALESCE(proposed_delivery_fee_cents, 0),
            total_cents = total_cents + COALESCE(proposed_delivery_fee_cents, 0),
            delivery_fee_accepted_at = CURRENT_TIMESTAMP,
            delivery_fee_status = 'CONFIRMED',
            status = 'ACCEPTED'
         WHERE id = ?`,
        [id],
    );
    return res.affectedRows;
}

async function updateAcceptWithProposedFee(conn, id, deliveryFeeCents) {
    const [res] = await conn.query(
        `UPDATE orders SET
            status = 'ACCEPTED_PENDING_FEE_CONFIRM',
            proposed_delivery_fee_cents = ?,
            proposed_delivery_fee_at = CURRENT_TIMESTAMP,
            delivery_fee_status = 'PROPOSED'
         WHERE id = ?`,
        [deliveryFeeCents, id],
    );
    return res.affectedRows;
}

async function updateDeliveryFeeDeclined(conn, id) {
    const [res] = await conn.query(
        `UPDATE orders SET status = 'CANCELLED', delivery_fee_status = 'NONE' WHERE id = ?`,
        [id],
    );
    return res.affectedRows;
}

/** Cancel a single COD order in ACCEPTED_PENDING_FEE_CONFIRM if proposed_delivery_fee_at is older than 24 hours. */
async function cancelExpiredFeeProposal(connOrPool, orderId) {
    const [res] = await connOrPool.query(
        `UPDATE orders SET status = 'CANCELLED', delivery_fee_status = 'NONE',
          cancelled_by = 'system', cancel_reason = 'delivery_fee_confirmation_expired'
         WHERE id = ? AND status = 'ACCEPTED_PENDING_FEE_CONFIRM' AND payment_method = 'COD'
           AND proposed_delivery_fee_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
        [orderId],
    );
    return res.affectedRows;
}

/** Cancel all COD orders in ACCEPTED_PENDING_FEE_CONFIRM where proposed_delivery_fee_at is older than 24 hours. */
async function cancelExpiredFeeProposals(connOrPool) {
    const [res] = await connOrPool.query(
        `UPDATE orders SET status = 'CANCELLED', delivery_fee_status = 'NONE',
          cancelled_by = 'system', cancel_reason = 'delivery_fee_confirmation_expired'
         WHERE status = 'ACCEPTED_PENDING_FEE_CONFIRM' AND payment_method = 'COD'
           AND proposed_delivery_fee_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
    );
    return res.affectedRows;
}

async function updateCancelCodWithReason(conn, id, status, cancelledBy, cancelReason, cancelReasonOther) {
    const [res] = await conn.query(
        `UPDATE orders SET status = ?, cancelled_by = ?, cancel_reason = ?, cancel_reason_other = ? WHERE id = ?`,
        [status, cancelledBy, cancelReason || null, cancelReasonOther || null, id],
    );
    return res.affectedRows;
}

module.exports = {
    insertOrder,
    findById,
    updateStatus,
    updatePayoutStatus,
    listPendingPayouts,
    updateStripePaymentIntent,
    setDeliveryCode,
    listByBuyer,
    listBySeller,
    listAll,
    updateProposeDeliveryFee,
    updateAcceptDeliveryFee,
    updateAcceptWithProposedFee,
    updateDeliveryFeeDeclined,
    cancelExpiredFeeProposal,
    cancelExpiredFeeProposals,
    updateCancelCodWithReason,
};
