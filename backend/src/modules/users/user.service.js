// src/modules/users/user.service.js
const db = require("./user.mysql");
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

    return out;
}

async function me(reqUser) {
    const userId = getUserId(reqUser);
    const user = await db.getById(userId);
    if (!user) throw err("NOT_FOUND", "User not found");

    // apply privacy masking for any "public" outputs later
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
    // default: ban=true (you can support unban by passing isBanned=false)
    const isBanned = body.isBanned !== undefined ? Boolean(body.isBanned) : true;
    return db.banUser(targetUserId, isBanned, reason);
}

module.exports = {
    me,
    updateMe,
    deleteMe,
    adminList,
    adminSetRole,
    adminBan,
};
