/**
 * Agora RTC Provider - use when react-native-agora is installed.
 * Requires: npm install react-native-agora (Expo Dev Client).
 */
import { env } from "../../utils/env";

export const AGORA_APP_ID = env.agoraAppId || "";

export function isAgoraAvailable() {
  try {
    require("react-native-agora");
    return !!AGORA_APP_ID;
  } catch {
    return false;
  }
}
