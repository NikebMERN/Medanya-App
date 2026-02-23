/**
 * Activity logging for report context (last 20 min).
 * Call when user performs key actions.
 */
import client from "../api/client";

export async function logActivity(payload) {
  try {
    await client.post("/activity", {
      action: payload.action,
      targetType: payload.targetType || "",
      targetId: payload.targetId || "",
      metadata: payload.metadata || {},
    });
  } catch (_) {
    // Silently ignore - activity is best-effort
  }
}
