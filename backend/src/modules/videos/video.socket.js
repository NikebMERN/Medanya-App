// src/modules/videos/video.socket.js
const logger = require("../../utils/logger.util");

function isValidRoomId(roomId) {
    return typeof roomId === "string" && /^video:[a-fA-F0-9]{24}$/.test(roomId);
}

function registerVideoSocket(io, socket) {
    // join a video room
    socket.on("video:join", async (payload, ack) => {
        try {
            const videoId = payload?.videoId;
            const roomId = `video:${videoId}`;

            if (!isValidRoomId(roomId)) {
                return ack && ack({ ok: false, error: "INVALID_VIDEO_ID" });
            }

            await socket.join(roomId);
            return ack && ack({ ok: true });
        } catch (e) {
            logger.warn("video:join error");
            return ack && ack({ ok: false, error: "SERVER_ERROR" });
        }
    });

    socket.on("video:leave", async (payload, ack) => {
        try {
            const videoId = payload?.videoId;
            const roomId = `video:${videoId}`;

            if (!isValidRoomId(roomId)) {
                return ack && ack({ ok: false, error: "INVALID_VIDEO_ID" });
            }

            await socket.leave(roomId);
            return ack && ack({ ok: true });
        } catch (e) {
            logger.warn("video:leave error");
            return ack && ack({ ok: false, error: "SERVER_ERROR" });
        }
    });
}

module.exports = { registerVideoSocket };
