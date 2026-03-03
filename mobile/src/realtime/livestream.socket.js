/**
 * Livestream Socket.IO events. stream:join, stream:leave, hostAway, hostBack, livestream_stop.
 */
import { getSocket } from "./socket";

/**
 * Join a stream room. Call when entering LiveHostScreen (host) or LivePlayerScreen (viewer).
 * Payload: { streamId }.
 */
export function joinStream(streamId, ack) {
  const socket = getSocket();
  if (!socket?.connected) {
    if (ack) ack({ ok: false, error: "NOT_CONNECTED" });
    return;
  }
  socket.emit("stream:join", { streamId }, ack || (() => {}));
}

/**
 * Leave a stream room. Call when exiting LiveHostScreen or LivePlayerScreen.
 */
export function leaveStream(streamId, ack) {
  const socket = getSocket();
  if (!socket?.connected) {
    if (ack) ack();
    return;
  }
  socket.emit("stream:leave", { streamId }, ack || (() => {}));
}

export function onStreamHostAway(handler) {
  const socket = getSocket();
  if (socket) socket.on("stream:hostAway", handler);
}

export function offStreamHostAway(handler) {
  const socket = getSocket();
  if (socket) socket.off("stream:hostAway", handler);
}

export function onStreamHostBack(handler) {
  const socket = getSocket();
  if (socket) socket.on("stream:hostBack", handler);
}

export function offStreamHostBack(handler) {
  const socket = getSocket();
  if (socket) socket.off("stream:hostBack", handler);
}

export function onStreamViewerCount(handler) {
  const socket = getSocket();
  if (socket) socket.on("stream:viewerCount", handler);
}

export function offStreamViewerCount(handler) {
  const socket = getSocket();
  if (socket) socket.off("stream:viewerCount", handler);
}

export function onLivestreamStop(handler) {
  const socket = getSocket();
  if (socket) socket.on("livestream_stop", handler);
}

export function offLivestreamStop(handler) {
  const socket = getSocket();
  if (socket) socket.off("livestream_stop", handler);
}
