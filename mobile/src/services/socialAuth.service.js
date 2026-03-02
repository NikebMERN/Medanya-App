/**
 * Social auth service with config guards and consistent return shape.
 * Never calls Firebase when auth is null; throws known errors when config missing.
 */
import { signInWithCredential, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";
import { auth, firebaseReady } from "../config/firebase";
import { getFeatureFlags } from "../config/appConfig";

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
 * Sign in with Google ID token (from expo-auth-session).
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

export const ERROR_CODES = {
  GOOGLE_AUTH_NOT_CONFIGURED: GOOGLE_NOT_CONFIGURED,
  FACEBOOK_AUTH_NOT_CONFIGURED: FACEBOOK_NOT_CONFIGURED,
};
