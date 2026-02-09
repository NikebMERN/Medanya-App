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
