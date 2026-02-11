import client from "./client";

/**
 * Update current user profile (displayName, email, neighborhood, avatarUrl, accountPrivate, lastLat, lastLng, etc.).
 */
export async function updateMe(payload) {
  const body = {};
  if (payload.displayName !== undefined) body.displayName = payload.displayName;
  if (payload.email !== undefined) body.email = payload.email;
  if (payload.neighborhood !== undefined) body.neighborhood = payload.neighborhood;
  if (payload.avatarUrl !== undefined) body.avatarUrl = payload.avatarUrl;
  if (payload.accountPrivate !== undefined) body.accountPrivate = payload.accountPrivate;
  if (payload.bio !== undefined) body.bio = payload.bio;
  if (payload.lastLat !== undefined) body.lastLat = payload.lastLat;
  if (payload.lastLng !== undefined) body.lastLng = payload.lastLng;
  const { data } = await client.patch("/users/me", body);
  return data;
}

/** Get current user profile. */
export async function getMe() {
  const { data } = await client.get("/users/me");
  return data;
}

/**
 * Upload avatar: 1) Upload image to Cloudinary (client), 2) Send returned URL to backend.
 * Returns { user } from backend after PATCH. The hosted URL is in user.avatar_url.
 */
export async function uploadAvatarAndSave(uri) {
  const { uploadToCloudinary } = await import("../utils/env");
  const hostedUrl = await uploadToCloudinary(uri, "image");
  console.log("[uploadAvatarAndSave] Cloudinary hosted URL:", hostedUrl);
  if (!hostedUrl) throw new Error("Could not get image URL from Cloudinary");
  const data = await updateMe({ avatarUrl: hostedUrl });
  console.log("[uploadAvatarAndSave] Backend response user.avatar_url:", data?.user?.avatar_url, "user:", data?.user);
  return data;
}

/** Get pending follow requests for the current user (when account is private). */
export async function getFollowRequests() {
  const { data } = await client.get("/users/me/follow-requests");
  return data;
}

/** Accept a follow request by request id. */
export async function acceptFollowRequest(requestId) {
  const { data } = await client.post(`/users/me/follow-requests/${requestId}/accept`);
  return data;
}

/** Reject a follow request by request id. */
export async function rejectFollowRequest(requestId) {
  const { data } = await client.post(`/users/me/follow-requests/${requestId}/reject`);
  return data;
}

/** Get followers of a user (for contact list / create group). */
export async function getFollowers(userId, params = {}) {
  const { data } = await client.get(`/users/${userId}/followers`, { params });
  return data;
}

/** Get users the current user is following. */
export async function getFollowing(userId, params = {}) {
  const { data } = await client.get(`/users/${userId}/following`, { params });
  return data;
}

/** Discover/search users by display name (MySQL users). Returns string ids for hybrid MongoDB chats. */
export async function discoverUsers(params = {}) {
  const res = await client.get("/users/discover", { params, timeout: 20000 });
  const data = res?.data ?? res;
  return {
    users: Array.isArray(data?.users) ? data.users : [],
    page: data?.page,
    limit: data?.limit,
    total: data?.total,
  };
}

/** Get public profile of another user (for viewing their profile). */
export async function getPublicProfile(userId) {
  const { data } = await client.get(`/users/${userId}`);
  return data;
}

/** Follow a user. */
export async function followUser(userId) {
  const { data } = await client.post(`/users/${userId}/follow`);
  return data;
}

/** Unfollow a user. */
export async function unfollowUser(userId) {
  const { data } = await client.delete(`/users/${userId}/follow`);
  return data;
}

/** Block a user. */
export async function blockUser(userId) {
  const { data } = await client.post(`/users/${userId}/block`);
  return data;
}

/** Unblock a user. */
export async function unblockUser(userId) {
  const { data } = await client.delete(`/users/${userId}/block`);
  return data;
}

/** List users blocked by the current user. */
export async function getBlockedUsers(params = {}) {
  const { data } = await client.get("/users/me/blocked", { params });
  return data;
}

/**
 * Check if two users are mutual followers (both follow each other).
 * Required to allow direct messaging.
 */
export async function checkMutualFollow(myId, otherId) {
  if (!myId || !otherId || String(myId) === String(otherId)) return false;
  const [followingRes, followersRes] = await Promise.all([
    getFollowing(myId, { limit: 500 }),
    getFollowers(myId, { limit: 500 }),
  ]);
  const iFollowIds = new Set((followingRes?.users || []).map((u) => String(u.id)));
  const followMeIds = new Set((followersRes?.users || []).map((u) => String(u.id)));
  const other = String(otherId);
  return iFollowIds.has(other) && followMeIds.has(other);
}
