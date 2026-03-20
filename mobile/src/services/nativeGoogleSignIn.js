/**
 * Native Google Sign-In (iOS/Android).
 * This is the preferred flow for Expo dev/prod builds (avoids redirect/popup issues).
 *
 * On web or when native module is unavailable, returns an explicit status so callers can show
 * a correct error instead of falling back to expo-auth-session on native.
 */
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";
let didConfigure = false;

/** Returns true if the RNGoogleSignin native module is present (dev/production build with the module linked). */
function hasGoogleSignInNativeModule() {
  try {
    const { TurboModuleRegistry } = require("react-native");
    return !!TurboModuleRegistry?.get?.("RNGoogleSignin");
  } catch {
    return false;
  }
}

/**
 * @param {string} webClientId - Google OAuth web client ID (required for idToken)
 * @returns {Promise<{ idToken: string } | { cancelled: true } | { unavailable: true }>}
 */
export async function getGoogleIdTokenNative(webClientId) {
  if (isWeb || !webClientId) return { unavailable: true };
  if (!hasGoogleSignInNativeModule()) return { unavailable: true };
  try {
    const { GoogleSignin, statusCodes } = require("@react-native-google-signin/google-signin");
    if (!didConfigure) {
      GoogleSignin.configure({ webClientId });
      if (Platform.OS === "android") {
        const { GoogleSignin: G } = require("@react-native-google-signin/google-signin");
        await G.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      didConfigure = true;
    }
    const res = await GoogleSignin.signIn();
    if (res?.type === "cancelled") return { cancelled: true };
    if (res?.type === "noSavedCredentialFound") return { unavailable: true };
    if (res?.type === "success" && res?.data) {
      const tokens = await GoogleSignin.getTokens();
      const idToken = tokens?.idToken ?? res?.data?.idToken;
      if (idToken) return { idToken };
    }
    return { unavailable: true };
  } catch (e) {
    if (e?.code === statusCodes?.SIGN_IN_CANCELLED || e?.code === statusCodes?.IN_PROGRESS)
      return { cancelled: true };
    if (__DEV__) console.warn("[Native Google Sign-In] failed:", e?.message || e);
    return { unavailable: true };
  }
}

