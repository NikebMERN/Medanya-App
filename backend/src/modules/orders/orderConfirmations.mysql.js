// src/modules/orders/orderConfirmations.mysql.js
const { pool } = require("../../config/mysql");

async function insert(conn, row) {
  const [res] = await conn.query(
    `INSERT INTO order_confirmations (
      order_id, code_hash, code_last4, code_encrypted, qr_token_hash,
      expires_at, attempts_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      row.order_id,
      row.code_hash,
      row.code_last4 || null,
      row.code_encrypted || null,
      row.qr_token_hash || null,
      row.expires_at,
      row.attempts_count ?? 0,
    ]
  );
  return res.insertId;
}

async function findByOrderId(connOrPool, orderId) {
  const [rows] = await connOrPool.query(
    `SELECT * FROM order_confirmations WHERE order_id = ? LIMIT 1`,
    [orderId]
  );
  return rows[0] || null;
}

async function incrementAttemptsAndLock(conn, orderId, lockedUntil) {
  const [res] = await conn.query(
    `UPDATE order_confirmations
     SET attempts_count = attempts_count + 1, locked_until = ?
     WHERE order_id = ?`,
    [lockedUntil, orderId]
  );
  return res.affectedRows;
}

async function markUsed(conn, orderId, usedBySellerId) {
  const [res] = await conn.query(
    `UPDATE order_confirmations SET used_at = NOW(), used_by_seller_id = ? WHERE order_id = ?`,
    [usedBySellerId, orderId]
  );
  return res.affectedRows;
}

module.exports = {
  insert,
  findByOrderId,
  incrementAttemptsAndLock,
  markUsed,
};
