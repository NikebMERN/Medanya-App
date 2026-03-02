/**
 * Auto-generated device identifier for API requests (X-Device-ID).
 * Uses SecureStore + Constants — no expo-application required.
 */
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const CACHE_KEY = "medanya_device_id";
let cachedId = null;

function simpleId() {
  const appId = Constants.expoConfig?.extra?.applicationId ?? Constants.expoConfig?.slug ?? "medanya";
  const r = Math.random().toString(36).slice(2, 14);
  return `${String(appId).replace(/\W/g, "_")}_${r}`;
}

/**
 * Returns a stable device identifier. Cached after first call.
 * @returns {Promise<string>}
 */
export async function getDeviceId() {
  if (cachedId) return cachedId;

  try {
    const stored = await SecureStore.getItemAsync(CACHE_KEY);
    if (stored && stored.length > 0) {
      cachedId = stored;
      return cachedId;
    }
  } catch (_) {}

  let id = simpleId();
  try {
    await SecureStore.setItemAsync(CACHE_KEY, id);
  } catch (_) {}

  cachedId = (id && String(id).trim()) || "unknown";
  return cachedId;
}
