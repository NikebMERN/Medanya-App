// src/modules/videos/video.controller.js
const service = require("./video.service");

function sendErr(res, err) {
    const code = err.code || "SERVER_ERROR";
    const status =
        code === "UNAUTHORIZED"
            ? 401
            : code === "FORBIDDEN"
                ? 403
                : code === "NOT_FOUND"
                    ? 404
                    : code === "VALIDATION_ERROR"
                        ? 400
                        : code === "DUPLICATE_REPORT"
                            ? 409
                            : 500;

    return res
        .status(status)
        .json({ error: { code, message: err.message || code } });
}

function emit(io, event, payload) {
    if (!io) return;
    io.emit(event, payload);
}

function emitRoom(io, room, event, payload) {
    if (!io) return;
    io.to(room).emit(event, payload);
}

// User
const create = async (req, res) => {
    try {
        const video = await service.createVideo(req.user, req.body);
        const io = req.app.get("io");

        if (video.status === "approved") {
            emit(io, "videos:new", { video });
            emit(io, "feed:new", {
                type: "video",
                id: video._id,
                createdAt: video.createdAt,
            }); // optional
        } else {
            // pending => admin-only channel
            io?.to("admins").emit("videos:new", { video });
        }

        return res.status(201).json({ success: true, video });
    } catch (err) {
        return sendErr(res, err);
    }
};

const list = async (req, res) => {
    try {
        const data = await service.listPublic(req.query);
        return res.json({ success: true, ...data });
    } catch (err) {
        return sendErr(res, err);
    }
};

const detail = async (req, res) => {
    try {
        const video = await service.getPublicById(req.params.id);
        return res.json({ success: true, video });
    } catch (err) {
        return sendErr(res, err);
    }
};

const like = async (req, res) => {
    try {
        const data = await service.toggleLike(req.user, req.params.id);
        const io = req.app.get("io");

        emitRoom(io, `video:${req.params.id}`, "videos:like", {
            videoId: req.params.id,
            likedBy: req.user.id ?? req.user.userId,
            liked: data.liked,
            likeCount: data.likeCount,
        });

        return res.json({ success: true, ...data });
    } catch (err) {
        return sendErr(res, err);
    }
};

const comment = async (req, res) => {
    try {
        const data = await service.addComment(req.user, req.params.id, req.body);
        const io = req.app.get("io");

        emitRoom(io, `video:${req.params.id}`, "videos:comment:new", {
            videoId: req.params.id,
            comment: data.comment,
            commentCount: data.commentCount,
        });

        return res.status(201).json({ success: true, ...data });
    } catch (err) {
        return sendErr(res, err);
    }
};

const deleteComment = async (req, res) => {
    try {
        const data = await service.deleteComment(
            req.user,
            req.params.id,
            req.params.commentId,
        );
        const io = req.app.get("io");

        emitRoom(io, `video:${req.params.id}`, "videos:comment:deleted", {
            videoId: req.params.id,
            commentId: req.params.commentId,
            commentCount: data.commentCount,
        });

        return res.json({ success: true, ...data });
    } catch (err) {
        return sendErr(res, err);
    }
};

const report = async (req, res) => {
    try {
        const data = await service.reportVideo(req.user, req.params.id, req.body);
        const io = req.app.get("io");

        io?.to("admins").emit("videos:reported", {
            videoId: req.params.id,
            reporterId: req.user.id ?? req.user.userId,
            reportCount: data.reportCount,
            status: data.status,
        });

        return res.status(201).json({ success: true, ...data });
    } catch (err) {
        return sendErr(res, err);
    }
};

// Admin
const adminList = async (req, res) => {
    try {
        const data = await service.adminList(req.query);
        return res.json({ success: true, ...data });
    } catch (err) {
        return sendErr(res, err);
    }
};

const approve = async (req, res) => {
    try {
        const video = await service.adminApprove(req.params.id);
        const io = req.app.get("io");

        emit(io, "videos:status", { videoId: video._id, status: video.status });

        // when approved, publish to public feed
        emit(io, "videos:new", { video });

        return res.json({ success: true, video });
    } catch (err) {
        return sendErr(res, err);
    }
};

const reject = async (req, res) => {
    try {
        const video = await service.adminReject(req.params.id, req.body?.note);
        const io = req.app.get("io");

        emit(io, "videos:status", { videoId: video._id, status: video.status });

        return res.json({ success: true, video });
    } catch (err) {
        return sendErr(res, err);
    }
};

const hide = async (req, res) => {
    try {
        const video = await service.adminHide(req.params.id, req.body?.note);
        const io = req.app.get("io");

        emit(io, "videos:status", { videoId: video._id, status: video.status });

        return res.json({ success: true, video });
    } catch (err) {
        return sendErr(res, err);
    }
};

module.exports = {
    create,
    list,
    detail,
    like,
    comment,
    deleteComment,
    report,
    adminList,
    approve,
    reject,
    hide,
};
