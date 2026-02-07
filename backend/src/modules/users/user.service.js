// src/modules/users/user.service.js
const db = require("./user.mysql");
const followDb = require("./follow.mysql");
const mask = require("../../utils/mask.util");

function err(code, message) {
    const e = new Error(message || code);
    e.code = code;
    return e;
}

const ALLOWED_ROLES = new Set(["user", "moderator", "admin"]);

function getUserId(reqUser) {
    const id = reqUser?.id ?? reqUser?.userId;
    if (!id) throw err("UNAUTHORIZED", "Login required");
    return String(id);
}

function validatePatch(body = {}) {
    const out = {};

    if (body.displayName !== undefined) {
        const v = String(body.displayName).trim();
        if (v.length < 2 || v.length > 50)
            throw err("VALIDATION_ERROR", "displayName must be 2-50 chars");
        out.display_name = v;
    }

    if (body.avatarUrl !== undefined) {
        const v = String(body.avatarUrl).trim();
        if (v.length > 500) throw err("VALIDATION_ERROR", "avatarUrl too long");
        out.avatar_url = v;
    }

    if (body.privacyHidePhone !== undefined) {
        out.privacy_hide_phone = body.privacyHidePhone ? 1 : 0;
    }

    if (body.notificationEnabled !== undefined) {
        out.notification_enabled = body.notificationEnabled ? 1 : 0;
    }

    if (body.neighborhood !== undefined) {
        const v = String(body.neighborhood || "").trim();
        out.neighborhood = v.length > 120 ? v.slice(0, 120) : (v || null);
    }
    if (body.bio !== undefined) {
        const v = String(body.bio || "").trim();
        out.bio = v.length > 500 ? v.slice(0, 500) : (v || null);
    }
    if (body.preferredTheme !== undefined) {
        const v = String(body.preferredTheme || "dark").toLowerCase();
        out.preferred_theme = ["light", "dark", "system"].includes(v) ? v : "dark";
    }

    return out;
}

async function me(reqUser) {
    const userId = getUserId(reqUser);
    const user = await db.getById(userId);
    if (!user) throw err("NOT_FOUND", "User not found");
    const [followers, following] = await Promise.all([
        followDb.countFollowers(userId),
        followDb.countFollowing(userId),
    ]);
    user.followerCount = followers;
    user.followingCount = following;
    return user;
}

async function updateMe(reqUser, body) {
    const userId = getUserId(reqUser);
    const fields = validatePatch(body);
    return db.updateById(userId, fields);
}

async function deleteMe(reqUser) {
    const userId = getUserId(reqUser);
    await db.deactivate(userId);
    return { deactivated: true };
}

/** Admin */
async function adminList(reqUser, query) {
    // requireRole handled by middleware
    return db.adminSearch(query);
}

async function adminSetRole(reqUser, targetUserId, role) {
    if (!ALLOWED_ROLES.has(role)) throw err("VALIDATION_ERROR", "Invalid role");

    const currentUserId = String(reqUser?.id ?? reqUser?.userId ?? "");
    if (currentUserId && String(targetUserId) === currentUserId) {
        throw err("FORBIDDEN", "Cannot change your own role");
    }

    // Prevent removing last admin
    const target = await db.getById(targetUserId);
    if (!target) throw err("NOT_FOUND", "User not found");

    if (target.role === "admin" && role !== "admin") {
        const adminCount = await db.countAdmins();
        if (adminCount <= 1) throw err("FORBIDDEN", "Cannot remove last admin");
    }

    return db.setRole(targetUserId, role);
}

async function adminBan(reqUser, targetUserId, body = {}) {
    const reason = body.reason ? String(body.reason).slice(0, 255) : null;
    const isBanned = body.isBanned !== undefined ? Boolean(body.isBanned) : true;
    return db.banUser(targetUserId, isBanned, reason);
}

async function adminSetVerified(reqUser, targetUserId, body = {}) {
    const verified = body.verified !== undefined ? Boolean(body.verified) : true;
    return db.setVerified(targetUserId, verified);
}

async function followUser(reqUser, targetUserId) {
    const followerId = getUserId(reqUser);
    if (String(followerId) === String(targetUserId)) throw err("VALIDATION_ERROR", "Cannot follow yourself");
    const target = await db.getById(targetUserId);
    if (!target) throw err("NOT_FOUND", "User not found");
    const added = await followDb.follow(followerId, targetUserId);
    return { following: true, added };
}

async function unfollowUser(reqUser, targetUserId) {
    const followerId = getUserId(reqUser);
    await followDb.unfollow(followerId, targetUserId);
    return { following: false };
}

async function getFollowers(reqUser, targetUserId, query) {
    const target = await db.getById(targetUserId);
    if (!target) throw err("NOT_FOUND", "User not found");
    return followDb.listFollowers(targetUserId, query);
}

async function getFollowing(reqUser, targetUserId, query) {
    const target = await db.getById(targetUserId);
    if (!target) throw err("NOT_FOUND", "User not found");
    return followDb.listFollowing(targetUserId, query);
}

async function discover(reqUser, query) {
    const currentUserId = getUserId(reqUser);
    return followDb.discoverUsers(currentUserId, query);
}

module.exports = {
    me,
    updateMe,
    deleteMe,
    adminList,
    adminSetRole,
    adminBan,
    adminSetVerified,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    discover,
};
