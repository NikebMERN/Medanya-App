/**
 * Analytics API — event tracking, user insights.
 */
import client from "../../api/client";

export async function trackEvent(type, entityType, entityId, meta = {}) {
  const { data } = await client.post("/analytics/event", {
    type,
    entityType: entityType || "",
    entityId: entityId || "",
    meta,
  });
  return data;
}

export async function getUserAnalytics(userId, range = 28) {
  const { data } = await client.get(`/analytics/user/${userId}`, { params: { range } });
  return data;
}

export async function getMyAnalytics(range = 28) {
  const { data } = await client.get("/analytics/user/me", { params: { range } });
  return data;
}
