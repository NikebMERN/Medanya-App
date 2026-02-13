/**
 * Socket.IO client singleton. Connects with JWT for auth.
 * Used by chat.socket.js. Reconnects when token is available.
 */
import { io } from "socket.io-client";
import { env } from "../utils/env";

let socket = null;

export function getSocket() {
  return socket;
}

export function connectSocket(token) {
  if (!token || typeof token !== "string") {
    disconnectSocket();
    return null;
  }
  if (socket) return socket;
  const url = (env.socketUrl || env.apiUrl || "").replace(/\/+$/, "");
  if (!url) return null;
  socket = io(url, {
    auth: { token },
    transports: ["websocket", "polling"],
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
