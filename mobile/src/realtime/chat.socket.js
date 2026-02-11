/**
 * Chat Socket.IO events. Join room, send message, listen for new messages.
 * Server joins socket to chat:${chatId} on chat:message:list or chat:message:send.
 */
import { getSocket, connectSocket } from "./socket";

const ROOM_PREFIX = "chat:";

function getChatRoom(chatId) {
  return `${ROOM_PREFIX}${chatId}`;
}

/**
 * Join a chat room (server joins socket when we call message:list with limit 1).
 * Call this when opening a chat room. Returns ack with messages (may be 0–1).
 */
export function joinChatRoom(chatId, ack) {
  const socket = getSocket();
  if (!socket?.connected) {
    if (ack) ack({ ok: false, error: "NOT_CONNECTED" });
    return;
  }
  socket.emit("chat:message:list", { chatId, limit: 1 }, ack || (() => {}));
}

/**
 * Leave is client-side only (stop listening). Server does not expose chat:leave.
 */
export function leaveChatRoom(chatId) {
  const socket = getSocket();
  if (socket) {
    socket.off("chat:message:new");
  }
}

/**
 * Send a message. Payload: { chatId, type: 'text'|'image'|'video'|'voice', text?, mediaUrl? }
 * Server emits chat:message:new to room; ack has messageId, createdAt.
 */
export function sendChatMessage(payload, ack) {
  const socket = getSocket();
  if (!socket?.connected) {
    if (ack) ack({ ok: false, error: "NOT_CONNECTED" });
    return;
  }
  socket.emit("chat:message:send", payload, ack || (() => {}));
}

/**
 * Subscribe to new messages (any chat room this socket is in).
 * Handler receives (message) where message has _id, chatId, senderId, type, text, mediaUrl, createdAt.
 */
export function onChatMessageNew(handler) {
  const socket = getSocket();
  if (socket) socket.on("chat:message:new", handler);
}

export function offChatMessageNew(handler) {
  const socket = getSocket();
  if (socket) socket.off("chat:message:new", handler);
}

/**
 * Ensure socket is connected with current token. Call when entering chat flow.
 */
export function ensureChatSocket(token) {
  return connectSocket(token);
}
