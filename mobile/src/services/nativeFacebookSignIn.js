/**
 * Native Facebook sign-in (iOS/Android) for Expo dev/production builds.
 * Uses react-native-fbsdk-next. Requires EAS/dev build (not Expo Go).
 * Do NOT use web_only — it causes redirect to Facebook app/home instead of returning to app.
 */
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";
let didInit = false;

function hasFbsdkNativeModule() {
  if (isWeb) return false;
  try {
    require("react-native-fbsdk-next");
    return true;
  } catch {
    return false;
  }
}

function initSdkOnce() {
  if (didInit) return;
  didInit = true;
  try {
    const { Settings } = require("react-native-fbsdk-next");
    Settings.initializeSDK();
  } catch (e) {
    if (__DEV__) console.warn("[Native Facebook] init failed:", e?.message);
  }
}

/**
 * Get Facebook access token via native SDK (for Firebase credential exchange).
 * Uses native app-switch flow; do not set web_only — it breaks return-to-app.
 * @param {object} [opts]
 * @param {string[]} [opts.permissions] - Default: ["public_profile", "email"]
 * @returns {Promise<{ accessToken: string } | { cancelled: true } | { unavailable: true } | { error: string }>}
 */
export async function getFacebookAccessTokenNative({ permissions = ["public_profile", "email"] } = {}) {
  if (isWeb) return { unavailable: true };
  if (!hasFbsdkNativeModule()) return { unavailable: true };

  try {
    initSdkOnce();
    const { LoginManager, AccessToken } = require("react-native-fbsdk-next");

    // Do NOT use setLoginBehavior("web_only") — it causes redirect to Facebook app
    // instead of returning to our app. Native flow (NATIVE_WITH_FALLBACK) is correct.
    const res = await LoginManager.logInWithPermissions(permissions);
    if (res?.isCancelled) return { cancelled: true };

    const token = await AccessToken.getCurrentAccessToken();
    const accessToken = token?.accessToken;
    if (!accessToken) return { unavailable: true, error: "No access token returned" };

    return { accessToken };
  } catch (e) {
    const msg = e?.message || String(e);
    if (msg.toLowerCase().includes("cancel") || msg.toLowerCase().includes("cancelled")) {
      return { cancelled: true };
    }
    if (__DEV__) console.warn("[Native Facebook Sign-In]", msg);
    return { unavailable: true, error: msg };
  }
}
