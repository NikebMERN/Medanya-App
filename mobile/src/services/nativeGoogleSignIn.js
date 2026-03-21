/**
 * Native Google Sign-In (iOS/Android), matching the standard RNGoogleSignin + Firebase flow:
 * configure(webClientId) → hasPlayServices → signIn() → idToken from response.data → Firebase credential.
 *
 * On web or when the native module is missing, returns { unavailable: true } so callers can use expo-auth-session.
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
 * @param {string} webClientId - Web OAuth client ID (Firebase “Web client” ID — required for idToken)
 * @returns {Promise<{ idToken: string } | { cancelled: true } | { unavailable: true }>}
 */
export async function getGoogleIdTokenNative(webClientId) {
  if (isWeb || !webClientId) return { unavailable: true };
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
      GoogleSignin.configure({ webClientId });
      didConfigure = true;
    }

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (isCancelledResponse(response)) {
      return { cancelled: true };
    }

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
    const { statusCodes, isErrorWithCode } = require("@react-native-google-signin/google-signin");
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
        case statusCodes.IN_PROGRESS:
          return { cancelled: true };
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        default:
          break;
      }
    }
    if (__DEV__) console.warn("[Native Google Sign-In] failed:", error?.message || error);
    return { unavailable: true };
  }
}
