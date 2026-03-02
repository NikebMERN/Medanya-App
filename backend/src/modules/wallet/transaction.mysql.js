// src/modules/wallet/transaction.mysql.js

async function insertTransaction(conn, tx) {
    const {
        user_id,
        type,
        amount,
        reference_type = null,
        reference_id = null,
        metadata = null,
    } = tx;

    const [res] = await conn.query(
        `INSERT INTO transactions
      (user_id, type, amount, reference_type, reference_id, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`,
        [user_id, type, amount, reference_type, reference_id, metadata],
    );

    return res.insertId;
}

async function listTransactions(conn, { userId, page, limit }) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (p - 1) * l;

    const [rows] = await conn.query(
        `SELECT id, user_id, type, amount, reference_type, reference_id, metadata, created_at
     FROM transactions
     WHERE user_id = ?
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
        [userId, l, offset],
    );

    const [countRows] = await conn.query(
        "SELECT COUNT(*) AS total FROM transactions WHERE user_id = ?",
        [userId],
    );

    return { page: p, limit: l, total: countRows[0].total, transactions: rows };
}

async function countTaskClaimsToday(conn, userId, taskType) {
    const [rows] = await conn.query(
        `SELECT COUNT(*) AS cnt FROM transactions
         WHERE user_id = ? AND type = 'credit' AND reference_type = 'task' AND reference_id = ?
         AND DATE(created_at) = CURDATE()`,
        [userId, String(taskType).toUpperCase()],
    );
    return rows[0]?.cnt ?? 0;
}

async function hasEverClaimedTask(conn, userId, taskType) {
    const [rows] = await conn.query(
        `SELECT 1 FROM transactions
         WHERE user_id = ? AND type = 'credit' AND reference_type = 'task' AND reference_id = ?
         LIMIT 1`,
        [userId, String(taskType).toUpperCase()],
    );
    return (rows && rows.length) > 0;
}

async function latestTransactions(conn, userId, n = 10) {
    const lim = Math.min(Math.max(parseInt(n, 10) || 10, 1), 50);
    const [rows] = await conn.query(
        `SELECT id, type, amount, reference_type, reference_id, metadata, created_at
     FROM transactions
     WHERE user_id = ?
     ORDER BY id DESC
     LIMIT ?`,
        [userId, lim],
    );
    return rows;
}

module.exports = {
    insertTransaction,
    listTransactions,
    latestTransactions,
    countTaskClaimsToday,
    hasEverClaimedTask,
};
