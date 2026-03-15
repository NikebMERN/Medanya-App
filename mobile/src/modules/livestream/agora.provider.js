/**
 * Agora RTC Provider - use when react-native-agora is installed and linked.
 * Requires: dev build (not Expo Go), pod install, native rebuild.
 * Not available on web (native module only).
 */
import { Platform } from "react-native";
import { env } from "../../utils/env";

export const AGORA_APP_ID = env.agoraAppId || "";

let _agoraUnavailable = false;

export function setAgoraUnavailable() {
  _agoraUnavailable = true;
}

export function isAgoraAvailable() {
  if (Platform.OS === "web") return false;
  if (_agoraUnavailable) return false;
  if (!AGORA_APP_ID) return false;
  try {
    require("react-native-agora");
    return true;
  } catch {
    return false;
  }
}
