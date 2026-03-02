// src/modules/orders/orderPayments.mysql.js
const { pool } = require("../../config/mysql");

async function insert(conn, row) {
  const [res] = await conn.query(
    `INSERT INTO order_payments (
      order_id, provider, payment_type, payment_intent_id, charge_id, amount_captured, currency,
      capture_status, escrow_status, paid_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.order_id,
      row.provider || "STRIPE",
      row.payment_type || "FULL",
      row.payment_intent_id || null,
      row.charge_id || null,
      row.amount_captured ?? null,
      row.currency || "aed",
      row.capture_status || "NONE",
      row.escrow_status || "NONE",
      row.paid_at || null,
    ]
  );
  return res.insertId;
}

async function findByOrderId(connOrPool, orderId) {
  const [rows] = await connOrPool.query(
    `SELECT * FROM order_payments WHERE order_id = ? LIMIT 1`,
    [orderId]
  );
  return rows[0] || null;
}

async function findByPaymentIntentId(connOrPool, paymentIntentId) {
  const [rows] = await connOrPool.query(
    `SELECT * FROM order_payments WHERE payment_intent_id = ? LIMIT 1`,
    [paymentIntentId]
  );
  return rows[0] || null;
}

async function updateCaptureAndEscrow(conn, orderId, captureStatus, escrowStatus, chargeId = null, amountCaptured = null) {
  const [res] = await conn.query(
    `UPDATE order_payments SET capture_status = ?, escrow_status = ?, charge_id = COALESCE(?, charge_id), amount_captured = COALESCE(?, amount_captured), paid_at = CASE WHEN ? = 'CAPTURED' THEN NOW() ELSE paid_at END, updated_at = NOW() WHERE order_id = ?`,
    [captureStatus, escrowStatus, chargeId, amountCaptured, captureStatus, orderId]
  );
  return res.affectedRows;
}

async function updateEscrowStatus(conn, orderId, escrowStatus) {
  const [res] = await conn.query(
    `UPDATE order_payments SET escrow_status = ?, updated_at = NOW() WHERE order_id = ?`,
    [escrowStatus, orderId]
  );
  return res.affectedRows;
}

async function markRefunded(conn, orderId) {
  const [res] = await conn.query(
    `UPDATE order_payments SET escrow_status = 'REFUNDED', refunded_at = NOW(), updated_at = NOW() WHERE order_id = ?`,
    [orderId]
  );
  return res.affectedRows;
}

module.exports = {
  insert,
  findByOrderId,
  findByPaymentIntentId,
  updateCaptureAndEscrow,
  updateEscrowStatus,
  markRefunded,
};
