/**
 * Social auth service: Firebase popup (web) and credential exchange (native).
 * Web: signInWithPopup only. Native: receives idToken/accessToken from native SDKs.
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

function success(token) {
  return { ok: true, firebaseIdToken: token };
}

function fail(opts) {
  return { ok: false, ...opts };
}

/**
 * Web only: Sign in with Google via Firebase signInWithPopup.
 * Do not use on native — use native SDK + signInWithGoogle(idToken) instead.
 */
export async function signInWithGoogleWebPopup() {
  if (!isWeb) return fail({ message: "Web only. Use native SDK on iOS/Android." });
  const flags = getFeatureFlags();
  if (!flags.googleEnabled) throw new Error(GOOGLE_NOT_CONFIGURED);
  if (!firebaseReady || !auth) {
    return fail({ errorCode: "MISSING_CONFIG", message: "Firebase is not configured." });
  }
  try {
    await authReady;
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const token = await result.user.getIdToken();
    return success(token);
  } catch (err) {
    return mapFirebaseError(err, "Google");
  }
}

/**
 * Exchange Google ID token (from native SDK) for Firebase credential and backend-ready idToken.
 * Use on native only; web should use signInWithGoogleWebPopup.
 */
export async function signInWithGoogle(idToken) {
  const flags = getFeatureFlags();
  if (!flags.googleEnabled) throw new Error(GOOGLE_NOT_CONFIGURED);
  if (!firebaseReady || !auth) {
    return fail({ errorCode: "MISSING_CONFIG", message: "Firebase is not configured." });
  }
  if (!idToken) return fail({ errorCode: "MISSING_TOKEN", message: "Google ID token is required." });

  try {
    await authReady;
    const credential = GoogleAuthProvider.credential(idToken);
    const userCred = await signInWithCredential(auth, credential);
    const token = await userCred.user.getIdToken();
    return success(token);
  } catch (err) {
    return mapCredentialError(err, "Google");
  }
}

/**
 * Exchange Facebook access token (from native SDK) for Firebase credential and backend-ready idToken.
 * Use on native only; web should use signInWithFacebookWebPopup.
 */
export async function signInWithFacebook(accessToken) {
  const flags = getFeatureFlags();
  if (!flags.facebookEnabled) throw new Error(FACEBOOK_NOT_CONFIGURED);
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
    return mapCredentialError(err, "Facebook");
  }
}

/**
 * Web only: Sign in with Facebook via Firebase signInWithPopup.
 * Do not use on native — use native SDK + signInWithFacebook(accessToken) instead.
 */
export async function signInWithFacebookWebPopup() {
  if (!isWeb) return fail({ message: "Web only. Use native SDK on iOS/Android." });
  const flags = getFeatureFlags();
  if (!flags.facebookEnabled) throw new Error(FACEBOOK_NOT_CONFIGURED);
  if (!firebaseReady || !auth) {
    return fail({ errorCode: "MISSING_CONFIG", message: "Firebase is not configured." });
  }
  try {
    await authReady;
    const provider = new FacebookAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const token = await result.user.getIdToken();
    return success(token);
  } catch (err) {
    return mapFirebaseError(err, "Facebook");
  }
}

function mapFirebaseError(err, provider) {
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

  if (code === "auth/argument-error") {
    return fail({
      errorCode: "AUTH_ARGUMENT_ERROR",
      message: `${provider} sign-in is misconfigured. Check Firebase Auth settings, Authorized domains (add localhost and your web domain), and that ${provider} provider is enabled.`,
    });
  }

  if (code === "auth/unauthorized-domain") {
    return fail({
      errorCode: "UNAUTHORIZED_DOMAIN",
      message: `This domain is not authorized for sign-in. Add it in Firebase Console → Authentication → Settings → Authorized domains.`,
    });
  }

  if (msg.includes("invalid") || msg.includes("credential") || msg.includes("network")) {
    return fail({
      errorCode: "AUTH_FAILED",
      message: err?.message || `${provider} sign-in failed.`,
    });
  }

  return fail({
    errorCode: "AUTH_FAILED",
    message: err?.message || `${provider} sign-in failed.`,
  });
}

function mapCredentialError(err, provider) {
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
      message: err?.message || `${provider} sign-in failed.`,
    });
  }

  return fail({
    errorCode: "AUTH_FAILED",
    message: err?.message || `${provider} sign-in failed.`,
  });
}

export const ERROR_CODES = {
  GOOGLE_AUTH_NOT_CONFIGURED: GOOGLE_NOT_CONFIGURED,
  FACEBOOK_AUTH_NOT_CONFIGURED: FACEBOOK_NOT_CONFIGURED,
};
