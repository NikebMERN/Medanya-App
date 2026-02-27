// src/modules/admin/adminBansAudit.js
const { pool } = require("../../config/mysql");
const Report = require("../unifiedReports/report.model");

async function listReports({ page = 1, limit = 30, targetType, reason, status } = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
    const skip = (p - 1) * l;

    const q = {};
    if (targetType) q.targetType = targetType;
    if (reason) q.reason = reason;
    if (status) q.status = status;

    const [items, [{ total }]] = await Promise.all([
        Report.find(q).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
        Report.aggregate([{ $match: q }, { $count: "total" }]).then((r) => (r.length ? r : [{ total: 0 }])),
    ]);

    return { reports: items, total, page: p, limit: l };
}

async function updateReportStatus(reportId, action, reason) {
    const report = await Report.findById(reportId);
    if (!report) return null;
    const status = action === "resolve" ? "RESOLVED" : action === "dismiss" ? "DISMISSED" : report.status;
    report.status = status;
    if (reason) report.adminActionTaken = String(reason).slice(0, 255);
    await report.save();
    return report;
}

async function listBans({ page = 1, limit = 50 } = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const offset = (p - 1) * l;

    const [[countRow]] = await pool.query(`SELECT COUNT(*) AS total FROM bans`);
    const [rows] = await pool.query(
        `SELECT id, type, value_hash, reason, created_by, created_at FROM bans ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [l, offset]
    );

    return { bans: rows, total: countRow.total, page: p, limit: l };
}

function hashValue(val) {
    if (!val) return null;
    const crypto = require("crypto");
    const SALT = process.env.KYC_HASH_SALT || "medanya-kyc-salt-v1";
    return crypto.createHmac("sha256", SALT).update(String(val)).digest("hex");
}

async function createBan({ type, value_hash, value, reason }, adminId) {
    const userDb = require("../users/user.mysql");
    const rawValue = value != null ? String(value).trim() : null;
    const hashed = rawValue ? hashValue(rawValue) : (value_hash || "");
    if (!hashed) throw new Error("Either value or value_hash is required");

    const [result] = await pool.query(
        `INSERT INTO bans (type, value_hash, reason, created_by) VALUES (?, ?, ?, ?)`,
        [type, hashed, reason || "", adminId]
    );

    if (type === "USER" && rawValue) {
        const uid = parseInt(rawValue, 10);
        if (!isNaN(uid)) await userDb.banUser(uid, true, reason || "Admin ban");
    } else if (type === "PHONE" && rawValue) {
        const [rows] = await pool.query(
            "UPDATE users SET is_banned = 1, banned_reason = ? WHERE phone_number = ?",
            [reason || "Admin ban (phone)", rawValue]
        );
    }

    const [[row]] = await pool.query(`SELECT * FROM bans WHERE id = ?`, [result.insertId]);
    return row;
}

async function deleteBan(id) {
    const [result] = await pool.query(`DELETE FROM bans WHERE id = ?`, [id]);
    return result.affectedRows > 0;
}

async function listAuditLog({ page = 1, limit = 50, adminId, actionType, targetType } = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const offset = (p - 1) * l;

    let where = "1=1";
    const params = [];
    if (adminId) {
        where += " AND admin_id = ?";
        params.push(adminId);
    }
    if (actionType) {
        where += " AND action_type = ?";
        params.push(actionType);
    }
    if (targetType) {
        where += " AND target_type = ?";
        params.push(targetType);
    }
    params.push(l, offset);

    const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM audit_log WHERE ${where}`,
        params.slice(0, -2)
    );
    const [rows] = await pool.query(
        `SELECT id, admin_id, action_type, target_type, target_id, metadata_json, created_at FROM audit_log WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        params
    );

    return { logs: rows, total: countRow.total, page: p, limit: l };
}

module.exports = {
    listReports,
    updateReportStatus,
    listBans,
    createBan,
    deleteBan,
    listAuditLog,
};
