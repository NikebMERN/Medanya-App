// src/modules/communityRooms/room.service.js
const mongoose = require("mongoose");
const RoomPost = require("./roomPost.model");
const RoomPostComment = require("./roomPostComment.model");
const RoomPostReport = require("./roomPostReport.model");

const { ROOM_CATEGORIES, POST_STATUSES } = require("./roomPost.model");

function err(code, message) {
    const e = new Error(message || code);
    e.code = code;
    throw e;
}

function toId(x) {
    return x == null ? "" : String(x);
}

function cleanStr(v, max = 5000) {
    const s = String(v || "").trim();
    return s.length > max ? s.slice(0, max) : s;
}

function isAdmin(user) {
    return user?.role === "admin";
}

function isModerator(user) {
    return user?.role === "moderator" || user?.role === "admin";
}

async function createPost(user, body) {
    const authorId = toId(user?.id ?? user?.userId);
    if (!authorId) err("UNAUTHORIZED", "Auth required");

    const category = cleanStr(body.category, 40);
    if (!ROOM_CATEGORIES.includes(category)) err("VALIDATION_ERROR", "Invalid category");
    const title = cleanStr(body.title, 200);
    const bodyText = cleanStr(body.body, 5000);
    if (!title) err("VALIDATION_ERROR", "Title required");

    const status = isModerator(user) ? "approved" : "pending";
    const doc = await RoomPost.create({
        category,
        authorId,
        title,
        body: bodyText,
        status,
    });
    return doc.toObject();
}

async function listPosts(category, { page = 1, limit = 20 } = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const skip = (p - 1) * l;

    const query = { status: "approved" };
    if (category && ROOM_CATEGORIES.includes(category)) query.category = category;

    const [items, total] = await Promise.all([
        RoomPost.find(query).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
        RoomPost.countDocuments(query),
    ]);
    return { page: p, limit: l, total, posts: items };
}

async function getPost(postId) {
    if (!mongoose.isValidObjectId(postId)) err("NOT_FOUND", "Post not found");
    const doc = await RoomPost.findOne({ _id: postId, status: "approved" }).lean();
    if (!doc) err("NOT_FOUND", "Post not found");
    return doc;
}

async function addComment(user, postId, body) {
    const authorId = toId(user?.id ?? user?.userId);
    if (!authorId) err("UNAUTHORIZED", "Auth required");
    if (!mongoose.isValidObjectId(postId)) err("NOT_FOUND", "Post not found");

    const post = await RoomPost.findOne({ _id: postId, status: "approved" });
    if (!post) err("NOT_FOUND", "Post not found");

    const text = cleanStr(body.text, 2000);
    const voiceUrl = body.voiceUrl ? cleanStr(body.voiceUrl, 600) : null;
    if (!text && !voiceUrl) err("VALIDATION_ERROR", "Text or voiceUrl required");

    const doc = await RoomPostComment.create({
        postId: post._id,
        authorId,
        text,
        voiceUrl: voiceUrl || undefined,
    });
    return doc.toObject();
}

async function listComments(postId, { page = 1, limit = 50 } = {}) {
    if (!mongoose.isValidObjectId(postId)) err("NOT_FOUND", "Post not found");
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const skip = (p - 1) * l;

    const post = await RoomPost.findOne({ _id: postId, status: "approved" });
    if (!post) err("NOT_FOUND", "Post not found");

    const [items, total] = await Promise.all([
        RoomPostComment.find({ postId, status: "visible" })
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(l)
            .lean(),
        RoomPostComment.countDocuments({ postId, status: "visible" }),
    ]);
    return { page: p, limit: l, total, comments: items };
}

async function reportPost(user, postId, body) {
    const reporterId = toId(user?.id ?? user?.userId);
    if (!reporterId) err("UNAUTHORIZED", "Auth required");
    if (!mongoose.isValidObjectId(postId)) err("NOT_FOUND", "Post not found");

    const post = await RoomPost.findById(postId);
    if (!post) err("NOT_FOUND", "Post not found");

    const reason = cleanStr(body.reason, 100);
    const description = cleanStr(body.description, 500);
    if (!reason) err("VALIDATION_ERROR", "Reason required");

    try {
        await RoomPostReport.create({
            postId: post._id,
            reporterId,
            reason,
            description,
        });
    } catch (e) {
        if (e.code === 11000) err("VALIDATION_ERROR", "Already reported this post");
        throw e;
    }
    await RoomPost.updateOne({ _id: postId }, { $inc: { reportCount: 1 } });
    return { reported: true };
}

async function adminListPosts(user, query) {
    if (!isAdmin(user)) err("FORBIDDEN", "Admin only");
    const status = query.status || "pending";
    const category = query.category;
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const q = {};
    if (POST_STATUSES.includes(status)) q.status = status;
    if (category && ROOM_CATEGORIES.includes(category)) q.category = category;

    const [items, total] = await Promise.all([
        RoomPost.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        RoomPost.countDocuments(q),
    ]);
    return { page, limit, total, posts: items };
}

async function adminModeratePost(user, postId, body) {
    if (!isAdmin(user)) err("FORBIDDEN", "Admin only");
    if (!mongoose.isValidObjectId(postId)) err("NOT_FOUND", "Post not found");

    const action = String(body.action || "").toLowerCase();
    if (!["approve", "reject", "hide"].includes(action)) err("VALIDATION_ERROR", "Invalid action");

    const doc = await RoomPost.findById(postId);
    if (!doc) err("NOT_FOUND", "Post not found");

    const statusMap = { approve: "approved", reject: "rejected", hide: "hidden" };
    doc.status = statusMap[action];
    doc.moderatedAt = new Date();
    doc.moderatedBy = toId(user?.id ?? user?.userId);
    await doc.save();
    return doc.toObject();
}

module.exports = {
    createPost,
    listPosts,
    getPost,
    addComment,
    listComments,
    reportPost,
    adminListPosts,
    adminModeratePost,
    ROOM_CATEGORIES,
};
