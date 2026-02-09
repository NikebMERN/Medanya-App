// src/modules/users/user.controller.js
const service = require("./user.service");

function sendErr(res, err) {
    const code = err.code || "SERVER_ERROR";
    const status =
        code === "UNAUTHORIZED"
            ? 401
            : code === "FORBIDDEN"
                ? 403
                : code === "NOT_FOUND"
                    ? 404
                    : code === "VALIDATION_ERROR" || code === "UPLOAD_ERROR"
                        ? 400
                        : 500;

    return res
        .status(status)
        .json({ error: { code, message: err.message || code } });
}

const me = async (req, res) => {
    try {
        const user = await service.me(req.user);
        res.json({ success: true, user });
    } catch (e) {
        sendErr(res, e);
    }
};

const patchMe = async (req, res) => {
    try {
        const user = await service.updateMe(req.user, req.body);
        res.json({ success: true, user });
    } catch (e) {
        sendErr(res, e);
    }
};

const deleteMe = async (req, res) => {
    try {
        const out = await service.deleteMe(req.user);
        res.json({ success: true, ...out });
    } catch (e) {
        sendErr(res, e);
    }
};

const uploadAvatar = async (req, res) => {
    try {
        const user = await service.uploadAvatar(req.user, req.file);
        res.json({ success: true, user, url: user.avatar_url });
    } catch (e) {
        sendErr(res, e);
    }
};

// Admin
const adminUsers = async (req, res) => {
    try {
        const data = await service.adminList(req.user, req.query);
        res.json({ success: true, ...data });
    } catch (e) {
        sendErr(res, e);
    }
};

const adminRole = async (req, res) => {
    try {
        const role = String(req.body?.role || "").trim();
        const user = await service.adminSetRole(
            req.user,
            String(req.params.id),
            role,
        );
        res.json({ success: true, user });
    } catch (e) {
        sendErr(res, e);
    }
};

const adminBan = async (req, res) => {
    try {
        const user = await service.adminBan(
            req.user,
            String(req.params.id),
            req.body,
        );
        res.json({ success: true, user });
    } catch (e) {
        sendErr(res, e);
    }
};

const adminVerify = async (req, res) => {
    try {
        const user = await service.adminSetVerified(
            req.user,
            String(req.params.id),
            req.body,
        );
        res.json({ success: true, user });
    } catch (e) {
        sendErr(res, e);
    }
};

const follow = async (req, res) => {
    try {
        const result = await service.followUser(req.user, String(req.params.id));
        res.json({ success: true, ...result });
    } catch (e) {
        sendErr(res, e);
    }
};

const unfollow = async (req, res) => {
    try {
        const result = await service.unfollowUser(req.user, String(req.params.id));
        res.json({ success: true, ...result });
    } catch (e) {
        sendErr(res, e);
    }
};

const followers = async (req, res) => {
    try {
        const data = await service.getFollowers(req.user, String(req.params.id), req.query);
        res.json({ success: true, ...data });
    } catch (e) {
        sendErr(res, e);
    }
};

const following = async (req, res) => {
    try {
        const data = await service.getFollowing(req.user, String(req.params.id), req.query);
        res.json({ success: true, ...data });
    } catch (e) {
        sendErr(res, e);
    }
};

const discoverUsers = async (req, res) => {
    try {
        const data = await service.discover(req.user, req.query);
        res.json({ success: true, ...data });
    } catch (e) {
        sendErr(res, e);
    }
};

const listFollowRequests = async (req, res) => {
    try {
        const data = await service.listFollowRequests(req.user);
        res.json({ success: true, ...data });
    } catch (e) {
        sendErr(res, e);
    }
};

const acceptFollowRequest = async (req, res) => {
    try {
        const data = await service.acceptFollowRequestById(req.user, String(req.params.id));
        res.json({ success: true, ...data });
    } catch (e) {
        sendErr(res, e);
    }
};

const rejectFollowRequest = async (req, res) => {
    try {
        const data = await service.rejectFollowRequestById(req.user, String(req.params.id));
        res.json({ success: true, ...data });
    } catch (e) {
        sendErr(res, e);
    }
};

module.exports = {
    me,
    patchMe,
    deleteMe,
    uploadAvatar,
    adminUsers,
    adminRole,
    adminBan,
    adminVerify,
    follow,
    unfollow,
    followers,
    following,
    listFollowRequests,
    acceptFollowRequest,
    rejectFollowRequest,
    discoverUsers,
};
