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

export async function createGroup(groupName, memberIds = []) {
  const ids = Array.isArray(memberIds) ? memberIds.map((id) => (id != null ? String(id) : id)) : [];
  const { data } = await client.post("/chats/group", { groupName, memberIds: ids });
  return data;
}
