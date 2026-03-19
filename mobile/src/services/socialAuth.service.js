/**
 * Social auth service with config guards and consistent return shape.
 * Awaits authReady so Firebase persistence has restored (fixes "missing initial state").
 */
import { Platform } from "react-native";
import {
  signInWithCredential,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
} from "firebase/auth";
import { auth, firebaseReady, authReady } from "../config/firebase";
import { getFeatureFlags } from "../config/appConfig";

const isWeb = Platform.OS === "web";

const GOOGLE_NOT_CONFIGURED = "GOOGLE_AUTH_NOT_CONFIGURED";
const FACEBOOK_NOT_CONFIGURED = "FACEBOOK_AUTH_NOT_CONFIGURED";

/**
 * @returns {{ ok: boolean, cancelled?: boolean, errorCode?: string, message?: string, firebaseIdToken?: string }}
 */
function success(token) {
  return { ok: true, firebaseIdToken: token };
}

/**
 * @returns {{ ok: boolean, cancelled?: boolean, errorCode?: string, message?: string, firebaseIdToken?: string }}
 */
function fail(opts) {
  return { ok: false, ...opts };
}

/**
 * Sign in with Google on web using Firebase popup (avoids COOP / window.closed issues).
 * Use this instead of expo-auth-session when Platform.OS === "web".
 * @returns {Promise<{ ok: boolean, cancelled?: boolean, firebaseIdToken?: string, message?: string }>}
 */
export async function signInWithGoogleWebPopup() {
  if (!isWeb) {
    return fail({ message: "Web only." });
  }
  const flags = getFeatureFlags();
  if (!flags.googleEnabled) {
    throw new Error(GOOGLE_NOT_CONFIGURED);
  }
  if (!firebaseReady || !auth) {
    return fail({ errorCode: "MISSING_CONFIG", message: "Firebase is not configured." });
  }
  try {
    await authReady;
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const token = await result.user.getIdToken();
    if (__DEV__) console.log("[Firebase] Google ID token:", token);
    return success(token);
  } catch (err) {
    const code = err?.code || err?.message || "";
    const msg = String(code).toLowerCase();

    // User cancelled / closed popup
    if (
      msg.includes("cancel") ||
      msg.includes("popup_closed") ||
      msg.includes("user_cancelled") ||
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request"
    ) {
      return fail({ cancelled: true });
    }

    // Common web misconfig: auth/argument-error from Firebase when provider or config is invalid
    if (code === "auth/argument-error") {
      return fail({
        errorCode: "AUTH_ARGUMENT_ERROR",
        message:
          "Google sign-in is misconfigured. Check your Firebase project Auth settings and authorized domains.",
      });
    }

    if (msg.includes("invalid") || msg.includes("credential") || msg.includes("network")) {
      return fail({
        errorCode: "AUTH_FAILED",
        message: err?.message || "Google sign-in failed.",
      });
    }

    return fail({
      errorCode: "AUTH_FAILED",
      message: err?.message || "Google sign-in failed.",
    });
  }
}

/**
 * Sign in with Google ID token (from expo-auth-session or native).
 * @param {string} idToken - Google ID token from OAuth flow
 */
export async function signInWithGoogle(idToken) {
  const flags = getFeatureFlags();
  if (!flags.googleEnabled) {
    throw new Error(GOOGLE_NOT_CONFIGURED);
  }
  if (!firebaseReady || !auth) {
    return fail({ errorCode: "MISSING_CONFIG", message: "Firebase is not configured." });
  }
  if (!idToken) {
    return fail({ errorCode: "MISSING_TOKEN", message: "Google ID token is required." });
  }

  try {
    await authReady;
    const credential = GoogleAuthProvider.credential(idToken);
    const userCred = await signInWithCredential(auth, credential);
    const token = await userCred.user.getIdToken();
    return success(token);
  } catch (err) {
    const code = err?.code || err?.message || "";
    const msg = String(code).toLowerCase();
    if (
      msg.includes("cancel") ||
      msg.includes("popup_closed") ||
      msg.includes("user_cancelled") ||
      code === "auth/user-cancelled"
    ) {
      return fail({ cancelled: true });
    }
    if (msg.includes("invalid") || msg.includes("credential") || msg.includes("network")) {
      return fail({
        errorCode: "AUTH_FAILED",
        message: err?.message || "Google sign-in failed.",
      });
    }
    return fail({
      errorCode: "AUTH_FAILED",
      message: err?.message || "Google sign-in failed.",
    });
  }
}

/**
 * Sign in with Facebook access token (from expo-auth-session).
 * @param {string} accessToken - Facebook access token from OAuth flow
 */
export async function signInWithFacebook(accessToken) {
  const flags = getFeatureFlags();
  if (!flags.facebookEnabled) {
    throw new Error(FACEBOOK_NOT_CONFIGURED);
  }
  if (!firebaseReady || !auth) {
    return fail({ errorCode: "MISSING_CONFIG", message: "Firebase is not configured." });
  }
  if (!accessToken) {
    return fail({ errorCode: "MISSING_TOKEN", message: "Facebook access token is required." });
  }

  try {
    await authReady;
    const credential = FacebookAuthProvider.credential(accessToken);
    const userCred = await signInWithCredential(auth, credential);
    const token = await userCred.user.getIdToken();
    return success(token);
  } catch (err) {
    const code = err?.code || err?.message || "";
    const msg = String(code).toLowerCase();
    if (
      msg.includes("cancel") ||
      msg.includes("popup_closed") ||
      msg.includes("user_cancelled") ||
      code === "auth/user-cancelled"
    ) {
      return fail({ cancelled: true });
    }
    if (msg.includes("invalid") || msg.includes("credential") || msg.includes("network")) {
      return fail({
        errorCode: "AUTH_FAILED",
        message: err?.message || "Facebook sign-in failed.",
      });
    }
    return fail({
      errorCode: "AUTH_FAILED",
      message: err?.message || "Facebook sign-in failed.",
    });
  }
}

/**
 * Sign in with Facebook on web using Firebase popup (standard web flow).
 * @returns {Promise<{ ok: boolean, cancelled?: boolean, firebaseIdToken?: string, message?: string }>}
 */
export async function signInWithFacebookWebPopup() {
  if (!isWeb) {
    return fail({ message: "Web only." });
  }
  const flags = getFeatureFlags();
  if (!flags.facebookEnabled) {
    throw new Error(FACEBOOK_NOT_CONFIGURED);
  }
  if (!firebaseReady || !auth) {
    return fail({ errorCode: "MISSING_CONFIG", message: "Firebase is not configured." });
  }
  try {
    await authReady;
    const provider = new FacebookAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const token = await result.user.getIdToken();
    if (__DEV__) console.log("[Firebase] Facebook ID token:", token);
    return success(token);
  } catch (err) {
    const code = err?.code || err?.message || "";
    const msg = String(code).toLowerCase();
    if (
      msg.includes("cancel") ||
      msg.includes("popup_closed") ||
      msg.includes("user_cancelled") ||
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request"
    ) {
      return fail({ cancelled: true });
    }
    return fail({
      errorCode: "AUTH_FAILED",
      message: err?.message || "Facebook sign-in failed.",
    });
  }
}

export const ERROR_CODES = {
  GOOGLE_AUTH_NOT_CONFIGURED: GOOGLE_NOT_CONFIGURED,
  FACEBOOK_AUTH_NOT_CONFIGURED: FACEBOOK_NOT_CONFIGURED,
};
