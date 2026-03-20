/**
 * Native Facebook sign-in (iOS/Android) for Expo dev/prod builds.
 * Uses react-native-fbsdk-next so we avoid expo-auth-session redirect/deep-link issues.
 */
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";
let didInit = false;

function hasFbsdkNativeModule() {
  try {
    // react-native-fbsdk-next is installed, but we still want to guard for unsupported runtime contexts.
    // If native modules aren't available, requiring here or calling initialize may fail.
    // eslint-disable-next-line global-require
    require("react-native-fbsdk-next");
    return true;
  } catch {
    return false;
  }
}

function initSdkOnce() {
  if (didInit) return;
  didInit = true;

  // eslint-disable-next-line global-require
  const { Settings } = require("react-native-fbsdk-next");
  Settings.initializeSDK();
}

/**
 * @returns {Promise<{ accessToken: string } | { cancelled: true } | { unavailable: true }>}
 */
export async function getFacebookAccessTokenNative({ permissions = ["public_profile", "email"] } = {}) {
  if (isWeb) return null;
  if (!hasFbsdkNativeModule()) return { unavailable: true };

  try {
    initSdkOnce();

    // eslint-disable-next-line global-require
    const { LoginManager, AccessToken } = require("react-native-fbsdk-next");

    const res = await LoginManager.logInWithPermissions(permissions);
    if (res?.isCancelled) return { cancelled: true };

    const token = await AccessToken.getCurrentAccessToken();
    const accessToken = token?.accessToken;
    if (!accessToken) return { unavailable: true };

    return { accessToken };
  } catch (e) {
    const msg = e?.message || String(e);
    // If SDK throws on user cancellation, map it into cancelled when possible.
    if (msg.toLowerCase().includes("cancel")) return { cancelled: true };
    if (__DEV__) console.warn("[Native Facebook Sign-In] failed:", msg);
    return { unavailable: true };
  }
}

