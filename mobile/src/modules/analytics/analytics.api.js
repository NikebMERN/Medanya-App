/**
 * Analytics API — event tracking, user insights.
 */
import client from "../../api/client";

export async function trackEvent(type, entityType, entityId, meta = {}) {
  try {
    const { data } = await client.post("/analytics/event", {
      type,
      entityType: entityType || "",
      entityId: entityId || "",
      meta,
    });
    console.log("[analytics.api] trackEvent:", type, data);
    return data;
  } catch (e) {
    console.log("[analytics.api] trackEvent error:", e?.response?.data ?? e?.message);
    throw e;
  }
}

export async function getUserAnalytics(userId, range = 28) {
  try {
    const { data } = await client.get(`/analytics/user/${userId}`, { params: { range } });
    console.log("[analytics.api] getUserAnalytics:", { userId, range, totalViews: data?.summary?.totalViews });
    return data;
  } catch (e) {
    console.log("[analytics.api] getUserAnalytics error:", e?.response?.data ?? e?.message);
    throw e;
  }
}

export async function getMyAnalytics(range = 28) {
  try {
    const { data } = await client.get("/analytics/user/me", { params: { range } });
    console.log("[analytics.api] getMyAnalytics:", { range, totalViews: data?.summary?.totalViews });
    return data;
  } catch (e) {
    console.log("[analytics.api] getMyAnalytics error:", e?.response?.data ?? e?.message);
    throw e;
  }
}
