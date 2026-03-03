/**
 * REST API for chats (MongoDB). JWT sent via client interceptor.
 * User ids from auth/MySQL are normalized to strings for MongoDB participants.
 */
import client from "../api/client";

export async function listChats(params = {}) {
  const res = await client.get("/chats", { params: { page: params.page, limit: params.limit } });
  const data = res?.data ?? res;
  return {
    chats: Array.isArray(data?.chats) ? data.chats : [],
    page: data?.page,
    limit: data?.limit,
    total: data?.total,
  };
}

/** Mark chat as read up to messageId. Call when user views chat. */
export async function markChatRead(chatId, messageId) {
  const { data } = await client.post(`/chats/${chatId}/read`, { messageId });
  return data;
}

export async function getChat(chatId) {
  const { data } = await client.get(`/chats/${chatId}`);
  return data;
}

export async function listMessages(chatId, params = {}) {
  const { data } = await client.get(`/chats/${chatId}/messages`, {
    params: { cursor: params.cursor, limit: params.limit },
  });
  return data;
}

export async function startDirect(peerUserId) {
  const { data } = await client.post("/chats/direct", {
    peerUserId: peerUserId != null ? String(peerUserId) : undefined,
  });
  return data;
}

export async function createGroup(groupName, memberIds = [], isChannel = false) {
  const ids = Array.isArray(memberIds) ? memberIds.map((id) => (id != null ? String(id) : id)) : [];
  const { data } = await client.post("/chats/group", { groupName, memberIds: ids, isChannel: !!isChannel });
  return data;
}

export async function setGroupName(chatId, groupName) {
  const { data } = await client.patch(`/chats/${chatId}/groupName`, { groupName });
  return data;
}

export async function addGroupMembers(chatId, memberIds = []) {
  const ids = Array.isArray(memberIds) ? memberIds.map((id) => (id != null ? String(id) : id)) : [];
  const { data } = await client.patch(`/chats/${chatId}/members/add`, { memberIds: ids });
  return data;
}

/** Search groups by name (q) or by chat id (id). Returns { groups: [{ id, groupName, participantCount, isMember }] } */
export async function searchGroups(params = {}) {
  const { data } = await client.get("/chats/search", { params: { q: params.q, id: params.id } });
  return data;
}

/** Join a group by chat id. Returns the chat. */
export async function joinGroup(chatId) {
  const { data } = await client.post(`/chats/${chatId}/join`);
  return data;
}

/** Leave a group/channel (current user removes themselves). */
export async function leaveGroup(chatId) {
  const { data } = await client.post(`/chats/${chatId}/leave`);
  return data;
}

/** Delete a group/channel (owner only). Deletes chat and messages. */
export async function deleteGroup(chatId) {
  const { data } = await client.delete(`/chats/${chatId}`);
  return data;
}

/** Delete message for everyone (sender or group admin). */
export async function deleteMessageForAll(chatId, messageId) {
  const { data } = await client.delete(`/chats/${chatId}/messages/${messageId}`);
  return data;
}

/** Hide message for current user only. */
export async function deleteMessageForMe(chatId, messageId) {
  const { data } = await client.patch(`/chats/${chatId}/messages/${messageId}/hide`);
  return data;
}

/** Set group/channel avatar URL (owner or member if permission granted). */
export async function setGroupAvatar(chatId, groupAvatarUrl) {
  const { data } = await client.patch(`/chats/${chatId}/groupAvatar`, { groupAvatarUrl });
  return data;
}

/** Set group/channel permissions (owner/admin only). */
export async function setGroupPermissions(chatId, payload) {
  const { data } = await client.patch(`/chats/${chatId}/permissions`, payload);
  return data;
}

/** Vote on a poll message. optionIndex is 0-based. */
export async function votePoll(chatId, messageId, optionIndex) {
  const { data } = await client.post(`/chats/${chatId}/messages/${messageId}/vote`, { optionIndex });
  return data;
}
