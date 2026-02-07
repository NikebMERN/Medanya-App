// src/modules/videos/video.service.js
const mongoose = require("mongoose");
const Video = require("./video.model");

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

async function createVideo(user, body) {
    const userId = toId(user?.id ?? user?.userId);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    const videoUrl = cleanStr(body.videoUrl, 800);
    const thumbnailUrl = cleanStr(body.thumbnailUrl, 800);
    const caption = cleanStr(body.caption, 300);
    const locationText = cleanStr(body.locationText, 200);

    if (!videoUrl) throw codeErr("VALIDATION_ERROR", "videoUrl is required");

    const status = user?.role === "admin" ? "approved" : "pending";

    const doc = await Video.create({
        createdBy: userId,
        videoUrl,
        thumbnailUrl,
        caption,
        locationText,
        status,
    });

    return doc.toObject();
}

async function listPublic({ page = 1, limit = 20 } = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
        Video.find({ status: "approved" })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(l)
            .select("-reports") // keep payload lighter
            .lean(),
        Video.countDocuments({ status: "approved" }),
    ]);

    return { page: p, limit: l, total, videos: items };
}

async function getPublicById(id) {
    if (!mongoose.isValidObjectId(id)) throw codeErr("NOT_FOUND", "Not found");
    const doc = await Video.findOne({ _id: id, status: "approved" })
        .select("-reports")
        .lean();
    if (!doc) throw codeErr("NOT_FOUND", "Not found");
    return doc;
}

async function toggleLike(user, videoId) {
    const userId = toId(user?.id ?? user?.userId);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");
    if (!mongoose.isValidObjectId(videoId))
        throw codeErr("NOT_FOUND", "Not found");

    // Like toggle (no duplicates)
    const doc = await Video.findById(videoId);
    if (!doc) throw codeErr("NOT_FOUND", "Not found");
    if (doc.status !== "approved")
        throw codeErr("FORBIDDEN", "Video not available");

    const idx = doc.likes.indexOf(userId);
    let liked;
    if (idx >= 0) {
        doc.likes.splice(idx, 1);
        liked = false;
    } else {
        doc.likes.push(userId);
        liked = true;
    }
    doc.likeCount = doc.likes.length;
    await doc.save();

    return { liked, likeCount: doc.likeCount };
}

async function addComment(user, videoId, body) {
    const userId = toId(user?.id ?? user?.userId);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");
    if (!mongoose.isValidObjectId(videoId))
        throw codeErr("NOT_FOUND", "Not found");

    const text = cleanStr(body.text, 500);
    if (!text) throw codeErr("VALIDATION_ERROR", "text is required");

    const doc = await Video.findById(videoId);
    if (!doc) throw codeErr("NOT_FOUND", "Not found");
    if (doc.status !== "approved")
        throw codeErr("FORBIDDEN", "Video not available");

    doc.comments.push({ userId, text, createdAt: new Date() });
    doc.commentCount = doc.comments.length;
    await doc.save();

    const last = doc.comments[doc.comments.length - 1];
    return { comment: last, commentCount: doc.commentCount };
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

    const doc = await Video.findById(videoId);
    if (!doc) throw codeErr("NOT_FOUND", "Not found");

    const idx = doc.comments.findIndex(
        (c) => String(c._id) === String(commentId),
    );
    if (idx < 0) throw codeErr("NOT_FOUND", "Comment not found");

    const c = doc.comments[idx];
    // Owner of comment OR admin can delete
    if (!isAdmin(user) && String(c.userId) !== String(userId)) {
        throw codeErr("FORBIDDEN", "Not allowed");
    }

    doc.comments.splice(idx, 1);
    doc.commentCount = doc.comments.length;
    await doc.save();

    return { ok: true, commentCount: doc.commentCount };
}

async function reportVideo(user, videoId, body) {
    const userId = toId(user?.id ?? user?.userId);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");
    if (!mongoose.isValidObjectId(videoId))
        throw codeErr("NOT_FOUND", "Not found");

    const reason = cleanStr(body.reason, 30) || "other";
    const note = cleanStr(body.note, 500);

    const allowed = [
        "spam",
        "nudity",
        "violence",
        "hate",
        "scam",
        "harassment",
        "other",
    ];
    if (!allowed.includes(reason))
        throw codeErr("VALIDATION_ERROR", "Invalid reason");

    const doc = await Video.findById(videoId);
    if (!doc) throw codeErr("NOT_FOUND", "Not found");

    // prevent spam: same reporter can report once (MVP)
    const already = doc.reports.some(
        (r) => String(r.reporterId) === String(userId),
    );
    if (already) throw codeErr("DUPLICATE_REPORT", "Already reported");

    doc.reports.push({ reporterId: userId, reason, note, createdAt: new Date() });
    doc.reportCount = doc.reports.length;

    // Auto-hide if reportCount grows (simple safety automation)
    if (doc.reportCount >= 10 && doc.status === "approved") {
        doc.status = "hidden";
        doc.moderationNote = "Auto-hidden due to high reports";
    }

    await doc.save();

    return { ok: true, reportCount: doc.reportCount, status: doc.status };
}

// Admin moderation
async function adminList({ status = "pending", page = 1, limit = 30 } = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
    const skip = (p - 1) * l;

    const q = status ? { status } : {};
    const [items, total] = await Promise.all([
        Video.find(q).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
        Video.countDocuments(q),
    ]);

    return { page: p, limit: l, total, videos: items };
}

async function adminApprove(videoId) {
    if (!mongoose.isValidObjectId(videoId))
        throw codeErr("NOT_FOUND", "Not found");
    const doc = await Video.findById(videoId);
    if (!doc) throw codeErr("NOT_FOUND", "Not found");
    doc.status = "approved";
    doc.moderationNote = "";
    await doc.save();
    return doc.toObject();
}

async function adminReject(videoId, note) {
    if (!mongoose.isValidObjectId(videoId))
        throw codeErr("NOT_FOUND", "Not found");
    const doc = await Video.findById(videoId);
    if (!doc) throw codeErr("NOT_FOUND", "Not found");
    doc.status = "rejected";
    doc.moderationNote = cleanStr(note, 300);
    await doc.save();
    return doc.toObject();
}

async function adminHide(videoId, note) {
    if (!mongoose.isValidObjectId(videoId))
        throw codeErr("NOT_FOUND", "Not found");
    const doc = await Video.findById(videoId);
    if (!doc) throw codeErr("NOT_FOUND", "Not found");
    doc.status = "hidden";
    doc.moderationNote = cleanStr(note, 300);
    await doc.save();
    return doc.toObject();
}

module.exports = {
    createVideo,
    listPublic,
    getPublicById,
    toggleLike,
    addComment,
    deleteComment,
    reportVideo,
    adminList,
    adminApprove,
    adminReject,
    adminHide,
};
