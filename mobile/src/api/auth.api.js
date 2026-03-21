import client from "./client";
import { env } from "../utils/env";

/** Dev-only: simulate auth when API URL is missing (e.g. empty or localhost placeholder). */
const isApiUrlMissing = () =>
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  (!env.apiUrl || env.apiUrl === "http://localhost:4001" || !env.apiUrl.trim());

/**
 * @param {string} phone - E.164 phone (e.g. "+971521234567")
 * @param {string} [sessionInfo] - From Firebase signInWithPhoneNumber (verificationId). When provided, backend stores it (SMS already sent by Firebase).
 */
export async function sendOtp(phone, sessionInfo) {
  const body = { phone };
  if (sessionInfo) body.sessionInfo = sessionInfo;
  const { data } = await client.post("/auth/otp/send", body);
  return data;
}

export async function verifyOtp(phone, code) {
  const { data } = await client.post("/auth/otp/verify", { phone, code });
  return data;
}

/**
 * Exchange Firebase idToken (from Google/Facebook sign-in) for backend JWT and user.
 * In __DEV__ when API URL is missing, returns a simulated response (never in production).
 * @param {string} idToken - Firebase ID token from user.getIdToken()
 */
export async function loginWithFirebaseToken(idToken) {
  if (isApiUrlMissing()) {
    return Promise.resolve({
      token: "dev-token",
      user: { id: 1, full_name: "Dev User", userId: 1 },
    });
  }
  const { data } = await client.post("/auth/firebase", { idToken });
  return data;
}

/** Link Google/Facebook to existing account (requires JWT). */
export async function linkFirebase(idToken) {
  const { data } = await client.post("/auth/link/firebase", { idToken });
  return data;
}

/**
 * Sign in as guest. Uses Firebase anonymous auth when available for a reliable
 * per-device guest session. Falls back to legacy shared guest if Firebase is unavailable.
 */
export async function loginAsGuest() {
  let idToken = null;
  try {
    const { signInAnonymouslyAndGetToken } = await import("../services/firebaseAuth");
    idToken = await signInAnonymouslyAndGetToken();
  } catch (e) {
    if (__DEV__) console.warn("[auth] Firebase anonymous unavailable, using legacy guest:", e?.message);
  }

  const body = idToken ? { idToken } : {};
  const { data } = await client.post("/auth/guest", body);
  return data;
}
