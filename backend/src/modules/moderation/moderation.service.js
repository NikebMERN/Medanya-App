const crypto = require("crypto");
const mongoose = require("mongoose");
const { pool } = require("../../config/mysql");
const banDb = require("./ban.mysql");
const userDb = require("../users/user.mysql");
const Video = require("../videos/video.model");
const Stream = require("../livestream/stream.model");
const ContentReport = require("./contentReport.model");
const { getReportReasonsSummary } = require("../../services/reportThreshold.service");

const BAN_TYPES = { USER: "USER", PHONE: "PHONE", DEVICE: "DEVICE", DOC_HASH: "DOC_HASH" };
const SALT = process.env.KYC_HASH_SALT || "medanya-kyc-salt-v1";

function hashValue(val) {
    if (!val) return null;
    return crypto.createHmac("sha256", SALT).update(String(val)).digest("hex");
}

async function listStreamsForModeration({ status = "stopped_pending_review", limit = 50 }) {
    const q = status ? { status } : {};
    const streams = await Stream.find(q).sort({ lastReportAt: -1, updatedAt: -1 }).limit(limit).lean();
    const streamIds = streams.map((s) => s._id.toString());
    const reportReasons = await Promise.all(
        streamIds.map((id) => getReportReasonsSummary("livestream", id)),
    );
    return {
        streams: streams.map((s, i) => ({
            ...s,
            reportReasons: reportReasons[i] || [],
        })),
    };
}

async function getModerationQueue(filters = {}) {
    const { kycStatus = "pending_manual", videoStatus = "HIDDEN_PENDING_REVIEW", streamStatus = "stopped_pending_review" } = filters;

    const [kycList, videos, streams] = await Promise.all([
        require("../kyc/kyc.mysql").listByStatus(kycStatus, { page: 1, limit: 50 }),
        Video.find({ status: { $in: [videoStatus, videoStatus === "HIDDEN_PENDING_REVIEW" ? "hidden" : videoStatus] } }).sort({ updatedAt: -1 }).limit(50).lean(),
        Stream.find({ status: streamStatus }).sort({ updatedAt: -1 }).limit(50).lean(),
    ]);

    const videoIds = videos.map((v) => v._id.toString());
    const streamIds = streams.map((s) => s._id.toString());
    const [videoReasons, streamReasons] = await Promise.all([
        Promise.all(videoIds.map((id) => getReportReasonsSummary("video", id))),
        Promise.all(streamIds.map((id) => getReportReasonsSummary("livestream", id))),
    ]);

    return {
        kyc: kycList.submissions || [],
        videos: videos.map((v, i) => ({
            ...v,
            reportReasons: videoReasons[i] || [],
        })),
        streams: streams.map((s, i) => ({
            ...s,
            reportReasons: streamReasons[i] || [],
        })),
    };
}

async function moderationVideoAction(videoId, action, adminUserId) {
    const vid = mongoose.Types.ObjectId.isValid(videoId) ? new mongoose.Types.ObjectId(videoId) : null;
    if (!vid) return null;
    const video = await Video.findById(vid);
    if (!video) return null;

    switch (action) {
        case "delete":
            await Video.updateOne({ _id: vid }, { $set: { status: "DELETED", moderationNote: "Deleted by admin" } });
            return { video: await Video.findById(vid).lean(), action: "deleted" };
        case "restore":
            await Video.updateOne({ _id: vid }, { $set: { status: "ACTIVE", moderationNote: "" } });
            return { video: await Video.findById(vid).lean(), action: "restored" };
        case "ban_user":
            await banDb.insertBan({ type: BAN_TYPES.USER, value_hash: hashValue(video.createdBy), reason: "Moderation: video" });
            await userDb.banUser(video.createdBy, true, "Banned from moderation");
            await Video.updateOne({ _id: vid }, { $set: { status: "DELETED" } });
            return { video: await Video.findById(vid).lean(), action: "ban_user" };
        case "ban_phone": {
            const u = await userDb.getById(video.createdBy);
            if (u?.phone_number) await banPhone(u.phone_number, "Moderation: video");
            await Video.updateOne({ _id: vid }, { $set: { status: "DELETED" } });
            return { video: await Video.findById(vid).lean(), action: "ban_phone" };
        }
        default:
            return null;
    }
}

async function moderationStreamAction(streamId, action, adminUserId) {
    const sid = mongoose.Types.ObjectId.isValid(streamId) ? new mongoose.Types.ObjectId(streamId) : null;
    if (!sid) return null;
    const stream = await Stream.findById(sid);
    if (!stream) return null;

    switch (action) {
        case "stop":
            await Stream.updateOne({ _id: sid }, { $set: { status: "stopped_pending_review", endedAt: new Date() } });
            return { stream: await Stream.findById(sid).lean(), action: "stopped" };
        case "end":
            await Stream.updateOne({ _id: sid }, { $set: { status: "ended", endedAt: new Date() } });
            return { stream: await Stream.findById(sid).lean(), action: "ended" };
        case "restore":
            await Stream.updateOne({ _id: sid }, { $set: { status: "live", reportCount: 0, lastReportAt: null } });
            return { stream: await Stream.findById(sid).lean(), action: "restored" };
        case "ban_user":
            await banDb.insertBan({ type: BAN_TYPES.USER, value_hash: hashValue(stream.hostId), reason: "Moderation: stream" });
            await userDb.banUser(stream.hostId, true, "Banned from stream moderation");
            await Stream.updateOne({ _id: sid }, { $set: { status: "banned", endedAt: new Date() } });
            return { stream: await Stream.findById(sid).lean(), action: "ban_user" };
        case "ban_phone": {
            const user = await userDb.getById(stream.hostId);
            if (user?.phone_number) {
                await banDb.insertBan({ type: BAN_TYPES.PHONE, value_hash: hashValue(user.phone_number), reason: "Moderation: stream" });
            }
            await Stream.updateOne({ _id: sid }, { $set: { status: "banned", endedAt: new Date() } });
            return { stream: await Stream.findById(sid).lean(), action: "ban_phone" };
        }
        case "delete":
            await Stream.deleteOne({ _id: sid });
            return { stream: null, action: "deleted" };
        default:
            return null;
    }
}

async function banUser(userId, reason) {
    await banDb.insertBan({ type: BAN_TYPES.USER, value_hash: hashValue(userId), reason });
    return userDb.banUser(userId, true, reason);
}

async function banPhone(phoneNumber, reason) {
    const normalized = normalizePhone(phoneNumber);
    const hashed = hashValue(normalized);
    await banDb.insertBan({ type: BAN_TYPES.PHONE, value_hash: hashed, reason });
    const [rows] = await pool.query(
        "UPDATE users SET is_banned = 1, banned_reason = ? WHERE phone_number = ?",
        [reason, phoneNumber],
    );
    return rows.affectedRows;
}

function isUserBanned(userId) {
    return banDb.isBanned(BAN_TYPES.USER, hashValue(userId));
}

function normalizePhone(phone) {
    const s = String(phone || "").replace(/\D/g, "");
    return s || "";
}

function isPhoneBanned(phoneNumber) {
    return banDb.isBanned(BAN_TYPES.PHONE, hashValue(normalizePhone(phoneNumber)));
}

module.exports = {
    getModerationQueue,
    moderationVideoAction,
    moderationStreamAction,
    banUser,
    banPhone,
    isUserBanned,
    isPhoneBanned,
    BAN_TYPES,
    hashValue,
};
