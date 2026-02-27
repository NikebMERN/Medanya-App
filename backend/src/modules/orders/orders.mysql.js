// src/modules/orders/orders.mysql.js
const { pool } = require("../../config/mysql");

async function insertOrder(conn, order) {
    const [res] = await conn.query(
        `INSERT INTO orders (
            buyer_id, seller_id, listing_id, qty, total_cents, commission_cents,
            status, payment_method, stripe_payment_intent_id, delivery_code_hash,
            delivery_code_sent_at, address_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            order.address_json ? JSON.stringify(order.address_json) : null,
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

module.exports = {
    insertOrder,
    findById,
    updateStatus,
    updateStripePaymentIntent,
    setDeliveryCode,
    listByBuyer,
    listBySeller,
};
