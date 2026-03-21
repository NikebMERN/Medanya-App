/**
 * Native Google Sign-In (iOS/Android) for Expo dev/production builds.
 * Flow: configure(webClientId) → signIn() → idToken → Firebase credential → backend JWT.
 * Requires @react-native-google-signin/google-signin and EAS/dev build (not Expo Go).
 */
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";
let didConfigure = false;

/** Returns true if the RNGoogleSignin native module is present. */
function hasGoogleSignInNativeModule() {
  if (isWeb) return false;
  try {
    const { TurboModuleRegistry } = require("react-native");
    const mod = TurboModuleRegistry?.get?.("RNGoogleSignin");
    if (mod) return true;
  } catch {
    // Fallback: try requiring the package; if it throws on web/native-missing, we'll catch
  }
  try {
    require("@react-native-google-signin/google-signin");
    return !isWeb;
  } catch {
    return false;
  }
}

/**
 * Get Google ID token via native SDK (for Firebase credential exchange).
 * @param {object} config
 * @param {string} config.webClientId - Firebase/Google Web OAuth client ID (required for idToken)
 * @param {string} [config.iosClientId] - Optional iOS client ID (from GoogleService-Info.plist)
 * @returns {Promise<{ idToken: string } | { cancelled: true } | { unavailable: true } | { error: string }>}
 */
export async function getGoogleIdTokenNative({ webClientId, iosClientId } = {}) {
  if (isWeb) return { unavailable: true };
  if (!webClientId || !webClientId.trim()) {
    return { unavailable: true, error: "Web client ID required" };
  }
  if (!hasGoogleSignInNativeModule()) return { unavailable: true };

  try {
    const {
      GoogleSignin,
      statusCodes,
      isErrorWithCode,
      isSuccessResponse,
      isCancelledResponse,
    } = require("@react-native-google-signin/google-signin");

    if (!didConfigure) {
      const config = { webClientId };
      if (iosClientId && iosClientId.trim()) config.iosClientId = iosClientId;
      GoogleSignin.configure(config);
      didConfigure = true;
    }

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (isCancelledResponse(response)) return { cancelled: true };

    if (isSuccessResponse(response)) {
      let idToken = response.data?.idToken ?? null;
      if (!idToken) {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens?.idToken ?? null;
      }
      if (idToken) return { idToken };
    }

    return { unavailable: true };
  } catch (error) {
    try {
      const { statusCodes, isErrorWithCode } = require("@react-native-google-signin/google-signin");
      if (isErrorWithCode && isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
          case statusCodes.IN_PROGRESS:
            return { cancelled: true };
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            return { unavailable: true, error: "Google Play Services not available" };
          default:
            break;
        }
      }
    } catch (_) {}
    if (__DEV__) console.warn("[Native Google Sign-In]", error?.message || error);
    return { unavailable: true, error: error?.message || "Google sign-in failed" };
  }
}
