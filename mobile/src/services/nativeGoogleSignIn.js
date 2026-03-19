/**
 * Native Google Sign-In (iOS/Android). Use for dev builds to avoid redirect/popup and "missing initial state".
 * On web or when native module is unavailable (Expo Go / old dev client), returns null so caller can use expo-auth-session.
 */
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

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
 * Get Google ID token via native sign-in. Returns { idToken } or null if web, cancelled, or unavailable.
 * @param {string} webClientId - Google OAuth web client ID (required for idToken)
 * @returns {Promise<{ idToken: string } | null>}
 */
export async function getGoogleIdTokenNative(webClientId) {
  if (isWeb || !webClientId) return null;
  if (!hasGoogleSignInNativeModule()) return null;
  try {
    const { GoogleSignin, statusCodes } = require("@react-native-google-signin/google-signin");
    GoogleSignin.configure({ webClientId });
    if (Platform.OS === "android") {
      const { GoogleSignin: G } = require("@react-native-google-signin/google-signin");
      await G.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    const res = await GoogleSignin.signIn();
    if (res?.type === "cancelled" || res?.type === "noSavedCredentialFound") return null;
    if (res?.type === "success" && res?.data) {
      const tokens = await GoogleSignin.getTokens();
      const idToken = tokens?.idToken ?? res?.data?.idToken;
      if (idToken) return { idToken };
    }
    return null;
  } catch (e) {
    if (e?.code === statusCodes?.SIGN_IN_CANCELLED || e?.code === statusCodes?.IN_PROGRESS) return null;
    if (__DEV__) console.warn("Native Google Sign-In failed (use Expo flow in Expo Go):", e?.message || e);
    return null;
  }
}

