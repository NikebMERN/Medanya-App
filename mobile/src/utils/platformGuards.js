import { Platform, Linking } from "react-native";
import { APP_STORE_URL, PLAY_STORE_URL } from "../config/platformLinks";

export const isWeb = Platform.OS === "web";
export const isNative = Platform.OS === "ios" || Platform.OS === "android";

export function getStoreLinks(overrides = {}) {
  return {
    playStoreUrl: overrides.playStoreUrl || PLAY_STORE_URL,
    appStoreUrl: overrides.appStoreUrl || APP_STORE_URL,
  };
}

export async function openExternalUrl(url) {
  if (!url) return false;
  try {
    const can = await Linking.canOpenURL(url);
    if (!can) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

