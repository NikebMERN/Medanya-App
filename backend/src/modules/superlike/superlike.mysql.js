const { pool } = require("../../config/mysql");

async function ensureBalance(conn, userId) {
  const [rows] = await conn.execute("SELECT user_id FROM user_superlike_balance WHERE user_id = ?", [userId]);
  if (rows.length === 0) {
    await conn.execute("INSERT INTO user_superlike_balance (user_id, balance) VALUES (?, 0)", [userId]);
  }
}

async function getBalance(conn, userId) {
  await ensureBalance(conn, userId);
  const [rows] = await conn.execute("SELECT balance FROM user_superlike_balance WHERE user_id = ?", [userId]);
  return rows[0]?.balance ?? 0;
}

async function getBalanceForUpdate(conn, userId) {
  const [rows] = await conn.execute("SELECT balance FROM user_superlike_balance WHERE user_id = ? FOR UPDATE", [userId]);
  if (rows.length === 0) {
    await conn.execute("INSERT INTO user_superlike_balance (user_id, balance) VALUES (?, 0)", [userId]);
    return { balance: 0 };
  }
  return { balance: rows[0].balance };
}

async function setBalance(conn, userId, balance) {
  await conn.execute(
    "INSERT INTO user_superlike_balance (user_id, balance) VALUES (?, ?) ON DUPLICATE KEY UPDATE balance = VALUES(balance)",
    [userId, Math.max(0, balance)]
  );
}

async function insertTx(conn, params) {
  const { user_id, type, amount, video_id, livestream_id, meta } = params;
  const [r] = await conn.execute(
    "INSERT INTO superlike_tx (user_id, type, amount, video_id, livestream_id, meta) VALUES (?, ?, ?, ?, ?, ?)",
    [user_id, type, amount, video_id || null, livestream_id || null, meta ? JSON.stringify(meta) : null]
  );
  return r.insertId;
}

async function hasClaimedWelcome(conn, userId) {
  const [rows] = await conn.execute("SELECT 1 FROM superlike_tx WHERE user_id = ? AND type = 'WELCOME' LIMIT 1", [userId]);
  return rows.length > 0;
}

async function getDailyEarnCount(conn, userId, type) {
  const [rows] = await conn.execute(
    "SELECT COUNT(*) as c FROM superlike_tx WHERE user_id = ? AND type = ? AND created_at >= CURDATE()",
    [userId, type]
  );
  return rows[0]?.c ?? 0;
}

module.exports = {
  pool,
  ensureBalance,
  getBalance,
  getBalanceForUpdate,
  setBalance,
  insertTx,
  hasClaimedWelcome,
  getDailyEarnCount,
};
