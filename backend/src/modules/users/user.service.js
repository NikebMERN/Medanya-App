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

    if (body.email !== undefined) {
        const v = String(body.email || "").trim().toLowerCase();
        if (v.length > 255) throw err("VALIDATION_ERROR", "email too long");
        if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw err("VALIDATION_ERROR", "Invalid email");
        out.email = v || null;
    }

    if (body.avatarUrl !== undefined) {
        const v = String(body.avatarUrl).trim();
        if (v.length > 500) throw err("VALIDATION_ERROR", "avatarUrl too long");
        out.avatar_url = v;
    }

    if (body.privacyHidePhone !== undefined) {
        out.privacy_hide_phone = body.privacyHidePhone ? 1 : 0;
    }
    if (body.accountPrivate !== undefined) {
        out.account_private = body.accountPrivate ? 1 : 0;
    }

    if (body.notificationEnabled !== undefined) {
        out.notification_enabled = body.notificationEnabled ? 1 : 0;
    }
    if (body.lastLat !== undefined) {
        const v = Number(body.lastLat);
        out.last_lat = Number.isFinite(v) ? v : null;
    }
    if (body.lastLng !== undefined) {
        const v = Number(body.lastLng);
        out.last_lng = Number.isFinite(v) ? v : null;
    }

    if (body.neighborhood !== undefined) {
        const v = String(body.neighborhood || "").trim();
        out.neighborhood = v.length > 120 ? v.slice(0, 120) : (v || null);
    }
    if (body.bio !== undefined) {
        const v = String(body.bio || "").trim();
        const maxLen = 800;
        out.bio = v.length > maxLen ? v.slice(0, maxLen) : (v || null);
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

async function uploadAvatar(reqUser, file) {
    if (!file || !file.buffer) throw err("VALIDATION_ERROR", "No image file provided");
    const userId = getUserId(reqUser);
    const { cloudinary, isConfigured } = require("../../config/cloudinary");

    if (isConfigured()) {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: "medanya/avatars",
                    resource_type: "image",
                    public_id: `user_${userId}_${Date.now()}`,
                },
                (uploadErr, result) => {
                    if (uploadErr) {
                        const msg = uploadErr.message || String(uploadErr);
                        return reject(err("UPLOAD_ERROR", `Cloudinary: ${msg}. Check CLOUDINARY_* in .env and use signed upload (API Secret).`));
                    }
                    if (!result || !result.secure_url) return reject(err("UPLOAD_ERROR", "Cloudinary upload failed"));
                    db.updateById(userId, { avatar_url: result.secure_url })
                        .then(resolve)
                        .catch(reject);
                },
            );
            uploadStream.end(file.buffer);
        });
    }

    const placeholderUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
    return db.updateById(userId, { avatar_url: placeholderUrl });
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

    const alreadyFollowing = await followDb.isFollowing(followerId, targetUserId);
    if (alreadyFollowing) return { following: true, added: false };

    const isPrivate = Boolean(target.account_private);
    if (isPrivate) {
        await followDb.createFollowRequest(followerId, targetUserId);
        return { following: false, requested: true };
    }

    const added = await followDb.follow(followerId, targetUserId);
    return { following: true, added };
}

async function unfollowUser(reqUser, targetUserId) {
    const followerId = getUserId(reqUser);
    await followDb.unfollow(followerId, targetUserId);
    return { following: false };
}

async function getFollowers(reqUser, targetUserId, query) {
    const reqUserId = getUserId(reqUser);
    const targetId = String(targetUserId);
    const target = await db.getById(targetUserId);
    if (!target) throw err("NOT_FOUND", "User not found");
    if (reqUserId !== targetId) {
        const isPrivate = Boolean(target.account_private);
        if (isPrivate) {
            const following = await followDb.isFollowing(reqUserId, targetUserId);
            if (!following) throw err("FORBIDDEN", "This account is private");
        }
    }
    return followDb.listFollowers(targetUserId, query);
}

async function getFollowing(reqUser, targetUserId, query) {
    const reqUserId = getUserId(reqUser);
    const targetId = String(targetUserId);
    const target = await db.getById(targetUserId);
    if (!target) throw err("NOT_FOUND", "User not found");
    if (reqUserId !== targetId) {
        const isPrivate = Boolean(target.account_private);
        if (isPrivate) {
            const following = await followDb.isFollowing(reqUserId, targetUserId);
            if (!following) throw err("FORBIDDEN", "This account is private");
        }
    }
    return followDb.listFollowing(targetUserId, query);
}

async function listFollowRequests(reqUser) {
    const userId = getUserId(reqUser);
    const requests = await followDb.listPendingRequestsForUser(userId);
    return { requests };
}

async function acceptFollowRequestById(reqUser, requestId) {
    const userId = getUserId(reqUser);
    const reqRow = await followDb.getFollowRequestById(requestId, userId);
    if (!reqRow) throw err("NOT_FOUND", "Follow request not found");
    await followDb.acceptFollowRequest(userId, reqRow.requester_id);
    return { accepted: true };
}

async function rejectFollowRequestById(reqUser, requestId) {
    const userId = getUserId(reqUser);
    const reqRow = await followDb.getFollowRequestById(requestId, userId);
    if (!reqRow) throw err("NOT_FOUND", "Follow request not found");
    await followDb.rejectFollowRequest(userId, reqRow.requester_id);
    return { rejected: true };
}

async function discover(reqUser, query) {
    const currentUserId = getUserId(reqUser);
    return followDb.discoverUsers(currentUserId, query);
}

async function getPublicProfile(reqUser, targetUserId) {
    const currentUserId = getUserId(reqUser);
    const targetId = String(targetUserId);
    if (targetId === currentUserId) throw err("VALIDATION_ERROR", "Use /users/me for own profile");
    const blockedByMe = await followDb.isBlocked(currentUserId, targetId);
    const blockedMe = await followDb.isBlocked(targetId, currentUserId);
    if (blockedByMe || blockedMe) throw err("NOT_FOUND", "User not found");
    const user = await db.getById(targetId);
    if (!user || !user.is_active) throw err("NOT_FOUND", "User not found");
    const [followerCount, followingCount, isFollowing, followsMe, followRequestPending] = await Promise.all([
        followDb.countFollowers(targetId),
        followDb.countFollowing(targetId),
        followDb.isFollowing(currentUserId, targetId),
        followDb.isFollowing(targetId, currentUserId),
        followDb.getPendingRequest(currentUserId, targetId),
    ]);
    const out = {
        id: user.id,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        neighborhood: user.neighborhood,
        bio: user.bio,
        is_verified: user.is_verified,
        account_private: user.account_private,
        followerCount,
        followingCount,
        isFollowing: !!isFollowing,
        followsMe: !!followsMe,
        followRequestPending: !!followRequestPending,
    };
    if (isFollowing && user.phone_number) out.phone_number = user.phone_number;
    return out;
}

async function blockUser(reqUser, targetUserId) {
    const currentUserId = getUserId(reqUser);
    const targetId = String(targetUserId);
    if (targetId === currentUserId) throw err("VALIDATION_ERROR", "Cannot block yourself");
    const target = await db.getById(targetId);
    if (!target) throw err("NOT_FOUND", "User not found");
    await followDb.unfollow(currentUserId, targetId);
    await followDb.unfollow(targetId, currentUserId);
    const added = await followDb.block(currentUserId, targetId);
    return { blocked: true, alreadyBlocked: !added };
}

async function unblockUser(reqUser, targetUserId) {
    const currentUserId = getUserId(reqUser);
    const targetId = String(targetUserId);
    await followDb.unblock(currentUserId, targetId);
    return { unblocked: true };
}

async function listBlocked(reqUser, query) {
    const currentUserId = getUserId(reqUser);
    return followDb.listBlocked(currentUserId, query);
}

module.exports = {
    me,
    updateMe,
    deleteMe,
    uploadAvatar,
    adminList,
    adminSetRole,
    adminBan,
    adminSetVerified,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    listFollowRequests,
    acceptFollowRequestById,
    rejectFollowRequestById,
    discover,
    getPublicProfile,
    blockUser,
    unblockUser,
    listBlocked,
};
