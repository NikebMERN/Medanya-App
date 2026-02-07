// src/modules/wallet/wallet.mysql.js
const { pool } = require("../../config/mysql");

async function ensureWallet(conn, userId) {
    await conn.query(
        "INSERT IGNORE INTO wallets (user_id, balance) VALUES (?, 0)",
        [userId],
    );
}

async function getWallet(conn, userId) {
    const [rows] = await conn.query(
        "SELECT user_id, balance, updated_at FROM wallets WHERE user_id = ?",
        [userId],
    );
    return rows[0] || null;
}

// locks row for transactional update
async function getWalletForUpdate(conn, userId) {
    await ensureWallet(conn, userId);
    const [rows] = await conn.query(
        "SELECT user_id, balance FROM wallets WHERE user_id = ? FOR UPDATE",
        [userId],
    );
    return rows[0] || null;
}

async function setBalance(conn, userId, newBalance) {
    await conn.query("UPDATE wallets SET balance = ? WHERE user_id = ?", [
        newBalance,
        userId,
    ]);
}

async function incrementBalance(conn, userId, delta) {
    // safest: read+set in transaction (we do that in service)
    await conn.query(
        "UPDATE wallets SET balance = balance + ? WHERE user_id = ?",
        [delta, userId],
    );
}

async function getBalance(poolOrConn, userId) {
    const [rows] = await poolOrConn.query(
        "SELECT balance FROM wallets WHERE user_id = ?",
        [userId],
    );
    return rows[0]?.balance ?? null;
}

module.exports = {
    pool,
    ensureWallet,
    getWallet,
    getWalletForUpdate,
    setBalance,
    incrementBalance,
    getBalance,
};
