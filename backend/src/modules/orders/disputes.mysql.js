// src/modules/orders/disputes.mysql.js
const { pool } = require("../../config/mysql");

async function findById(connOrPool, id) {
  const [rows] = await connOrPool.query(
    `SELECT * FROM disputes WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function list(connOrPool, { status, page = 1, limit = 20 } = {}) {
  const p = Math.max(parseInt(page, 10) || 1, 1);
  const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const offset = (p - 1) * l;
  let where = "1=1";
  const params = [];
  if (status) {
    where += " AND status = ?";
    params.push(status);
  }
  const countParams = status ? [status] : [];
  const [rows] = await connOrPool.query(
    `SELECT * FROM disputes WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...countParams, l, offset]
  );
  const [[countRow]] = await connOrPool.query(
    `SELECT COUNT(*) AS total FROM disputes WHERE ${where}`,
    countParams
  );
  return { page: p, limit: l, total: countRow.total, disputes: rows };
}

async function updateStatus(conn, id, status) {
  const [res] = await conn.query(
    `UPDATE disputes SET status = ?, updated_at = NOW() WHERE id = ?`,
    [status, id]
  );
  return res.affectedRows;
}

module.exports = { findById, list, updateStatus };
