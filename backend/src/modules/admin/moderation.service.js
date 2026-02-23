// src/modules/admin/moderation.service.js
const { pool } = require("../../config/mysql");
const mongoose = require("mongoose");
const ModerationQueue = require("../unifiedReports/moderationQueue.model");
const Report = require("../unifiedReports/report.model");
const jobDb = require("../jobs/job.mysql");
const marketDb = require("../marketplace/market.mysql");
const Video = require("../videos/video.model");
const Stream = require("../livestream/stream.model");
const MissingPerson = require("../missingPersons/missing.model");

function toId(x) {
    return x == null ? "" : String(x);
}

function toObjectId(id) {
    if (!id) return null;
    if (typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id)) return new mongoose.Types.ObjectId(id);
    return id;
}

async function auditLog(adminId, actionType, targetType, targetId, metadata = {}) {
    await pool.query(
        `INSERT INTO audit_log (admin_id, action_type, target_type, target_id, metadata_json) VALUES (?, ?, ?, ?, ?)`,
        [adminId || null, actionType, toId(targetType), toId(targetId), JSON.stringify(metadata)],
    );
}

async function listModerationQueue({ status = "PENDING", targetType, priority, limit = 50 } = {}) {
    const q = { status: status || "PENDING" };
    if (targetType) q.targetType = targetType;
    if (priority) q.priority = priority;

    const items = await ModerationQueue.find(q)
        .sort({ priority: -1, createdAt: 1 })
        .limit(Math.min(parseInt(limit, 10) || 50, 100))
        .lean();

    const [{ total }] = await ModerationQueue.aggregate([
        { $match: q },
        { $count: "total" },
    ]).then((r) => (r.length ? r : [{ total: 0 }]));

    const enriched = await Promise.all(
        items.map(async (item) => {
            const content = await getItemPreview(item.targetType, item.targetId);
            return { ...item, content };
        }),
    );

    return { items: enriched, total };
}

async function getItemPreview(targetType, targetId) {
    const tid = toId(targetId);
    try {
        if (targetType === "JOB") {
            const job = await jobDb.findJobById(tid);
            return job ? { title: job.title, imageUrl: job.image_url, createdBy: job.created_by } : null;
        }
        if (targetType === "MARKET_ITEM") {
            const item = await marketDb.findById(tid);
            return item ? { title: item.title, imageUrls: item.image_urls, sellerId: item.seller_id } : null;
        }
        if (targetType === "VIDEO") {
            const v = await Video.findById(toObjectId(tid)).lean();
            return v ? { caption: v.caption, thumbnailUrl: v.thumbnailUrl, uploaderId: v.uploaderId } : null;
        }
        if (targetType === "LIVESTREAM") {
            const s = await Stream.findById(toObjectId(tid)).lean();
            return s ? { title: s.title, hostId: s.hostId } : null;
        }
        if (targetType === "MISSING_PERSON") {
            const m = await MissingPerson.findById(toObjectId(tid)).lean();
            return m ? { fullName: m.fullName, photoUrl: m.photoUrl } : null;
        }
        if (targetType === "USER") {
            const [[u]] = await pool.query(`SELECT id, display_name, avatar_url FROM users WHERE id = ?`, [tid]);
            return u ? { displayName: u.display_name, avatarUrl: u.avatar_url } : null;
        }
    } catch (_) {}
    return null;
}

async function getModerationItemDetail(targetType, targetId) {
    const tid = toId(targetId);
    const queueItem = await ModerationQueue.findOne({ targetType, targetId: tid }).lean();
    const reports = await Report.find({ targetType, targetId: tid }).sort({ createdAt: -1 }).limit(50).lean();
    let content = null;

    if (targetType === "JOB") content = await jobDb.findJobById(tid);
    else if (targetType === "MARKET_ITEM") content = await marketDb.findById(tid);
    else if (targetType === "VIDEO") content = await Video.findById(toObjectId(tid)).lean();
    else if (targetType === "LIVESTREAM") content = await Stream.findById(toObjectId(tid)).lean();
    else if (targetType === "MISSING_PERSON") content = await MissingPerson.findById(toObjectId(tid)).lean();
    else if (targetType === "USER") {
        const [rows] = await pool.query(`SELECT * FROM users WHERE id = ?`, [tid]);
        content = rows[0] || null;
    }

    return { queueItem, reports, content };
}

async function executeModerationAction(adminId, { actionType, targetType, targetId, reason, banLevel }) {
    const tid = toId(targetId);

    if (actionType === "hide") {
        if (targetType === "JOB") await pool.query(`UPDATE jobs SET status = 'HIDDEN_PENDING_REVIEW' WHERE id = ?`, [tid]);
        else if (targetType === "MARKET_ITEM") await pool.query(`UPDATE marketplace_items SET status = 'HIDDEN_PENDING_REVIEW' WHERE id = ?`, [tid]);
        else if (targetType === "VIDEO") await Video.updateOne({ _id: toObjectId(tid) }, { $set: { status: "HIDDEN_PENDING_REVIEW" } });
        else if (targetType === "LIVESTREAM") await Stream.updateOne({ _id: toObjectId(tid) }, { $set: { status: "stopped_pending_review" } });
        else if (targetType === "MISSING_PERSON") await MissingPerson.updateOne({ _id: toObjectId(tid) }, { $set: { status: "pending_review" } });
    } else if (actionType === "restore") {
        if (targetType === "JOB") await pool.query(`UPDATE jobs SET status = 'active' WHERE id = ?`, [tid]);
        else if (targetType === "MARKET_ITEM") await pool.query(`UPDATE marketplace_items SET status = 'active' WHERE id = ?`, [tid]);
        else if (targetType === "VIDEO") await Video.updateOne({ _id: toObjectId(tid) }, { $set: { status: "ACTIVE" } });
        else if (targetType === "LIVESTREAM") await Stream.updateOne({ _id: toObjectId(tid) }, { $set: { status: "ended" } });
        else if (targetType === "MISSING_PERSON") await MissingPerson.updateOne({ _id: toObjectId(tid) }, { $set: { status: "active" } });
    } else if (actionType === "delete") {
        if (targetType === "JOB") await pool.query(`UPDATE jobs SET status = 'closed' WHERE id = ?`, [tid]);
        else if (targetType === "MARKET_ITEM") await pool.query(`UPDATE marketplace_items SET status = 'removed' WHERE id = ?`, [tid]);
        else if (targetType === "VIDEO") await Video.updateOne({ _id: toObjectId(tid) }, { $set: { status: "DELETED" } });
        else if (targetType === "LIVESTREAM") await Stream.updateOne({ _id: toObjectId(tid) }, { $set: { status: "ended" } });
    } else if (actionType === "ban_user") {
        const level = banLevel === "hard" ? 1 : 0;
        await pool.query(`UPDATE users SET is_banned = 1 WHERE id = ?`, [tid]);
        await pool.query(
            `INSERT INTO bans (type, value_hash, reason, created_by) VALUES ('USER', ?, ?, ?)`,
            [tid, reason || "Moderation ban", adminId],
        );
    }

    await ModerationQueue.updateOne(
        { targetType, targetId: tid },
        { $set: { status: "ACTIONED", updatedAt: new Date() } },
    );

    await auditLog(adminId, actionType, targetType, tid, { reason, banLevel });

    return { success: true, actionType };
}

async function getModerationCounts() {
    const [pending, urgent, bannedUsers] = await Promise.all([
        ModerationQueue.countDocuments({ status: "PENDING" }),
        ModerationQueue.countDocuments({ status: "PENDING", priority: "URGENT" }),
        pool.query(`SELECT COUNT(*) AS c FROM users WHERE is_banned = 1`).then(([[r]]) => r?.c ?? 0),
    ]);
    return { pending, urgent, bannedUsers };
}

module.exports = {
    listModerationQueue,
    getModerationItemDetail,
    executeModerationAction,
    getModerationCounts,
    auditLog,
};
