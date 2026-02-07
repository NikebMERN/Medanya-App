// src/modules/communityRooms/room.controller.js
const service = require("./room.service");

function sendErr(res, err) {
    const code = err.code || "SERVER_ERROR";
    const status =
        code === "UNAUTHORIZED" ? 401
            : code === "FORBIDDEN" ? 403
                : code === "NOT_FOUND" ? 404
                    : code === "VALIDATION_ERROR" ? 400
                        : 500;
    return res.status(status).json({
        success: false,
        error: { code, message: err.message || code },
    });
}

async function createPost(req, res) {
    try {
        const post = await service.createPost(req.user, req.body);
        return res.status(201).json({ success: true, post });
    } catch (e) {
        return sendErr(res, e);
    }
}

async function listPosts(req, res) {
    try {
        const data = await service.listPosts(req.query.category, req.query);
        return res.json({ success: true, ...data });
    } catch (e) {
        return sendErr(res, e);
    }
}

async function getPost(req, res) {
    try {
        const post = await service.getPost(req.params.id);
        return res.json({ success: true, post });
    } catch (e) {
        return sendErr(res, e);
    }
}

async function addComment(req, res) {
    try {
        const comment = await service.addComment(req.user, req.params.id, req.body);
        return res.status(201).json({ success: true, comment });
    } catch (e) {
        return sendErr(res, e);
    }
}

async function listComments(req, res) {
    try {
        const data = await service.listComments(req.params.id, req.query);
        return res.json({ success: true, ...data });
    } catch (e) {
        return sendErr(res, e);
    }
}

async function reportPost(req, res) {
    try {
        await service.reportPost(req.user, req.params.id, req.body);
        return res.json({ success: true, message: "Report submitted" });
    } catch (e) {
        return sendErr(res, e);
    }
}

async function adminListPosts(req, res) {
    try {
        const data = await service.adminListPosts(req.user, req.query);
        return res.json({ success: true, ...data });
    } catch (e) {
        return sendErr(res, e);
    }
}

async function adminModeratePost(req, res) {
    try {
        const post = await service.adminModeratePost(req.user, req.params.id, req.body);
        return res.json({ success: true, post });
    } catch (e) {
        return sendErr(res, e);
    }
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
};
