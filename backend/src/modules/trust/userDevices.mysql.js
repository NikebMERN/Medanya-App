const { pool } = require("../../config/mysql");

async function insertDevice({ userId, deviceId, ipAddress }) {
    const [result] = await pool.query(
        "INSERT INTO user_devices (user_id, device_id, ip_address) VALUES (?, ?, ?)",
        [userId, deviceId || "unknown", ipAddress || null]
    );
    return result.insertId;
}

async function countAccountsByDeviceId(deviceId) {
    const [[row]] = await pool.query(
        "SELECT COUNT(DISTINCT user_id) AS cnt FROM user_devices WHERE device_id = ?",
        [deviceId]
    );
    return Number(row?.cnt ?? 0);
}

async function countAccountsByIp(ipAddress) {
    if (!ipAddress) return 0;
    const [[row]] = await pool.query(
        "SELECT COUNT(DISTINCT user_id) AS cnt FROM user_devices WHERE ip_address = ?",
        [ipAddress]
    );
    return Number(row?.cnt ?? 0);
}

async function deviceUsedByBannedUser(deviceId) {
    const [rows] = await pool.query(
        `SELECT 1 FROM user_devices d
         JOIN users u ON u.id = d.user_id AND u.is_banned = 1
         WHERE d.device_id = ? LIMIT 1`,
        [deviceId]
    );
    return rows.length > 0;
}

module.exports = { insertDevice, countAccountsByDeviceId, countAccountsByIp, deviceUsedByBannedUser };
