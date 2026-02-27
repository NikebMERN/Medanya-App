// src/modules/videos/video.service.js
const mongoose = require("mongoose");
const Video = require("./video.model");
const VideoLike = require("./videoLike.model");
const VideoComment = require("./videoComment.model");
const userDb = require("../users/user.mysql");
const videoPinsDb = require("./video_pins.mysql");
const marketDb = require("../marketplace/market.mysql");
const { createReportAndCheckThreshold } = require("../../services/reportThreshold.service");

function codeErr(code, message) {
    const e = new Error(message || code);
    e.code = code;
    return e;
}

function toId(x) {
    return x === null || x === undefined ? "" : String(x);
}

function cleanStr(v, max = 1000) {
    const s = String(v || "").trim();
    if (!s) return "";
    return s.length > max ? s.slice(0, max) : s;
}

function isAdmin(user) {
    return user?.role === "admin";
}

function normalizeStatus(s) {
    // legacy -> canonical
    if (s === "approved") return "ACTIVE";
    if (s === "pending") return "PENDING_REVIEW";
    if (s === "hidden") return "HIDDEN_PENDING_REVIEW";
    if (s === "rejected") return "DELETED";
    if (s === "pending_review") return "PENDING_REVIEW";
    if (s === "hidden_pending_review") return "HIDDEN_PENDING_REVIEW";
    return s;
}

function isActiveStatus(s) {
    const ns = normalizeStatus(s);
    return ns === "ACTIVE";
}

function ageFromDob(dob) {
    if (!dob) return null;
    const d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
    return age;
}

async function createVideo(user, body) {
    const userId = toId(user?.id ?? user?.userId);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");
    if (user?.role === "guest") throw codeErr("FORBIDDEN", "Guest users cannot upload videos. Sign in to upload.");

    const uploader = await userDb.getById(userId);
    if (!uploader) throw codeErr("UNAUTHORIZED", "User not found");
    const kycVerified = !!(uploader.kyc_face_verified || (uploader.kyc_status === "verified" && (uploader.kyc_level || 0) >= 2));
    if (!kycVerified) throw codeErr("FORBIDDEN", "Identity verification required. Complete verification in Profile before posting videos.");
    if (!uploader.dob) throw codeErr("AGE_REQUIRED", "Date of birth required to post videos. Add it in Edit Profile.");
    const age = ageFromDob(uploader.dob);
    if (age == null || age < 16) throw codeErr("AGE_REQUIRED", "You must be 16 or older to post videos.");

    const videoUrl = cleanStr(body.videoUrl, 800);
    const thumbnailUrl = cleanStr(body.thumbnailUrl, 800);
    const caption = cleanStr(body.caption, 300);
    const locationText = cleanStr(body.locationText, 200);
    const durationSec = Number.isFinite(Number(body.durationSec)) ? Math.max(0, Number(body.durationSec)) : 0;

    if (!videoUrl) throw codeErr("VALIDATION_ERROR", "videoUrl is required");

    // Thumbnail-first: if no thumbnail or suspicious flags, mark pending review.
    // TODO: integrate thumbnail scanning/ML and set matchedFlags + pending_review.
    const status = isAdmin(user) ? "ACTIVE" : "PENDING_REVIEW";

    const doc = await Video.create({
        uploaderId: userId,
        createdBy: userId,
        videoUrl,
        thumbnailUrl,
        caption,
        locationText,
        durationSec,
        status,
    });

    const out = doc.toObject();
    out.status = normalizeStatus(out.status);
    return out;
}

async function listPublic({ page = 1, limit = 20 } = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const skip = (p - 1) * l;

    const q = { status: { $in: ["ACTIVE", "approved"] } };
    const [items, total] = await Promise.all([
        Video.find(q)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(l)
            .lean(),
        Video.countDocuments(q),
    ]);

    return {
        page: p,
        limit: l,
        total,
        videos: items.map((v) => ({ ...v, status: normalizeStatus(v.status) })),
    };
}

async function getPublicById(id) {
    if (!mongoose.isValidObjectId(id)) throw codeErr("NOT_FOUND", "Not found");
    const doc = await Video.findById(id).lean();
    if (!doc) throw codeErr("NOT_FOUND", "Not found");
    const st = normalizeStatus(doc.status);
    if (st !== "ACTIVE") {
        throw codeErr("FORBIDDEN", "This content is under review or unavailable");
    }
    return { ...doc, status: st };
}

async function deleteByOwner(user, videoId) {
    const userId = toId(user?.id ?? user?.userId);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");
    if (!mongoose.isValidObjectId(videoId)) throw codeErr("NOT_FOUND", "Not found");
    const doc = await Video.findById(videoId);
    if (!doc) throw codeErr("NOT_FOUND", "Not found");
    if (!isAdmin(user) && String(doc.uploaderId || doc.createdBy) !== String(userId)) {
        throw codeErr("FORBIDDEN", "Not allowed");
    }
    doc.status = "DELETED";
    await doc.save();
    return { ok: true, status: normalizeStatus(doc.status) };
}

async function likeVideo(user, videoId) {
    const userId = toId(user?.id ?? user?.userId);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");
    if (!mongoose.isValidObjectId(videoId)) throw codeErr("NOT_FOUND", "Not found");
    const doc = await Video.findById(videoId);
    if (!doc) throw codeErr("NOT_FOUND", "Not found");
    if (!isActiveStatus(doc.status)) throw codeErr("FORBIDDEN", "Video not available");

    try {
        await VideoLike.create({ videoId, userId });
    } catch (e) {
        // duplicate -> already liked
    }
    const likeCount = await VideoLike.countDocuments({ videoId });
    await Video.updateOne({ _id: videoId }, { $set: { likeCount } });
    return { liked: true, likeCount };
}

async function unlikeVideo(user, videoId) {
    const userId = toId(user?.id ?? user?.userId);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");
    if (!mongoose.isValidObjectId(videoId)) throw codeErr("NOT_FOUND", "Not found");
    await VideoLike.deleteOne({ videoId, userId });
    const likeCount = await VideoLike.countDocuments({ videoId });
    await Video.updateOne({ _id: videoId }, { $set: { likeCount } });
    return { liked: false, likeCount };
}

async function listComments(videoId, { page = 1, limit = 20 } = {}) {
    if (!mongoose.isValidObjectId(videoId)) throw codeErr("NOT_FOUND", "Not found");
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const skip = (p - 1) * l;
    const [items, total] = await Promise.all([
        VideoComment.find({ videoId }).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
        VideoComment.countDocuments({ videoId }),
    ]);
    return { page: p, limit: l, total, comments: items };
}

async function addComment(user, videoId, body) {
    const userId = toId(user?.id ?? user?.userId);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");
    if (!mongoose.isValidObjectId(videoId)) throw codeErr("NOT_FOUND", "Not found");
    const text = cleanStr(body.text, 500);
    if (!text) throw codeErr("VALIDATION_ERROR", "text is required");
    const doc = await Video.findById(videoId);
    if (!doc) throw codeErr("NOT_FOUND", "Not found");
    if (!isActiveStatus(doc.status)) throw codeErr("FORBIDDEN", "Video not available");

    const comment = await VideoComment.create({ videoId, userId, text });
    const commentCount = await VideoComment.countDocuments({ videoId });
    await Video.updateOne({ _id: videoId }, { $set: { commentCount } });
    return { comment: comment.toObject(), commentCount };
}

async function deleteComment(user, videoId, commentId) {
    const userId = toId(user?.id ?? user?.userId);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");
    if (
        !mongoose.isValidObjectId(videoId) ||
        !mongoose.isValidObjectId(commentId)
    ) {
        throw codeErr("NOT_FOUND", "Not found");
    }

    const c = await VideoComment.findById(commentId);
    if (!c || String(c.videoId) !== String(videoId)) throw codeErr("NOT_FOUND", "Comment not found");
    if (!isAdmin(user) && String(c.userId) !== String(userId)) throw codeErr("FORBIDDEN", "Not allowed");
    await VideoComment.deleteOne({ _id: commentId });
    const commentCount = await VideoComment.countDocuments({ videoId });
    await Video.updateOne({ _id: videoId }, { $set: { commentCount } });
    return { ok: true, commentCount };
}

async function reportVideo(user, videoId, body) {
    const userId = toId(user?.id ?? user?.userId);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");
    if (!mongoose.isValidObjectId(videoId)) throw codeErr("NOT_FOUND", "Not found");
    const doc = await Video.findById(videoId);
    if (!doc) throw codeErr("NOT_FOUND", "Not found");
    const reason = cleanStr(body.reason, 50) || "other";

    const out = await createReportAndCheckThreshold({
        targetType: "video",
        targetId: String(videoId),
        reporterId: String(userId),
        reason,
    });
    // fetch updated video status
    const updated = await Video.findById(videoId).lean();
    return { ok: true, reportCount: updated?.reportCount ?? 0, status: normalizeStatus(updated?.status) };
}

// Admin moderation
async function adminList({ status = "PENDING_REVIEW", page = 1, limit = 30 } = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
    const skip = (p - 1) * l;

    const q = status ? { status: { $in: [status, status === "PENDING_REVIEW" ? "pending" : status] } } : {};
    const [items, total] = await Promise.all([
        Video.find(q).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
        Video.countDocuments(q),
    ]);

    return { page: p, limit: l, total, videos: items.map((v) => ({ ...v, status: normalizeStatus(v.status) })) };
}

async function adminApprove(videoId) {
    if (!mongoose.isValidObjectId(videoId))
        throw codeErr("NOT_FOUND", "Not found");
    const doc = await Video.findById(videoId);
    if (!doc) throw codeErr("NOT_FOUND", "Not found");
    doc.status = "ACTIVE";
    doc.moderationNote = "";
    await doc.save();
    return doc.toObject();
}

async function adminReject(videoId, note) {
    if (!mongoose.isValidObjectId(videoId))
        throw codeErr("NOT_FOUND", "Not found");
    const doc = await Video.findById(videoId);
    if (!doc) throw codeErr("NOT_FOUND", "Not found");
    doc.status = "DELETED";
    doc.moderationNote = cleanStr(note, 300);
    await doc.save();
    return doc.toObject();
}

async function adminHide(videoId, note) {
    if (!mongoose.isValidObjectId(videoId))
        throw codeErr("NOT_FOUND", "Not found");
    const doc = await Video.findById(videoId);
    if (!doc) throw codeErr("NOT_FOUND", "Not found");
    doc.status = "HIDDEN_PENDING_REVIEW";
    doc.moderationNote = cleanStr(note, 300);
    await doc.save();
    return doc.toObject();
}

async function pinListing(user, videoId, listingId) {
    const userId = toId(user?.id ?? user?.userId);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");
    if (!mongoose.isValidObjectId(videoId)) throw codeErr("NOT_FOUND", "Video not found");

    const video = await Video.findById(videoId).lean();
    if (!video) throw codeErr("NOT_FOUND", "Video not found");
    if (!isActiveStatus(video.status)) throw codeErr("FORBIDDEN", "Video not available");

    const ownerId = String(video.uploaderId || video.createdBy || "");
    if (ownerId !== userId) throw codeErr("FORBIDDEN", "Only the video owner can pin listings");

    const listing = await marketDb.findById(listingId);
    if (!listing) throw codeErr("NOT_FOUND", "Listing not found");
    if (String(listing.seller_id) !== ownerId)
        throw codeErr("FORBIDDEN", "Can only pin your own listings");

    const listId = Number(listingId);
    if (!Number.isInteger(listId) || listId <= 0)
        throw codeErr("VALIDATION_ERROR", "Invalid listingId");

    const { pool } = require("../../config/mysql");
    const conn = await pool.getConnection();
    try {
        const maxOrder = await videoPinsDb.getMaxSortOrder(conn, videoId);
        await videoPinsDb.insertPin(conn, {
            video_id: videoId,
            listing_id: listId,
            user_id: userId,
            sort_order: maxOrder + 1,
        });
    } finally {
        conn.release();
    }

    return getPins(videoId);
}

async function getPins(videoId) {
    if (!mongoose.isValidObjectId(videoId)) return { pins: [], items: [] };
    const { pool } = require("../../config/mysql");
    const rawPins = await videoPinsDb.getPinsByVideoId(pool, videoId);
    const pins = rawPins.map((p) => ({ id: p.id, listing_id: p.listing_id, sort_order: p.sort_order, created_at: p.created_at }));
    const items = [];
    for (const p of rawPins) {
        const item = await marketDb.findById(p.listing_id);
        if (item && (item.status || "").toLowerCase() === "active")
            items.push({ ...item, pin_id: p.id });
    }
    return { pins, items };
}

module.exports = {
    createVideo,
    listPublic,
    getPublicById,
    pinListing,
    getPins,
    likeVideo,
    unlikeVideo,
    listComments,
    addComment,
    deleteComment,
    reportVideo,
    deleteByOwner,
    adminList,
    adminApprove,
    adminReject,
    adminHide,
};
