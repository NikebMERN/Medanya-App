import client from "./client";

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
 * @param {string} idToken - Firebase ID token from user.getIdToken()
 */
export async function loginWithFirebaseToken(idToken) {
  const { data } = await client.post("/auth/verify-otp", { idToken });
  return data;
}

/**
 * Sign in as guest. Guest can only watch videos.
 */
export async function loginAsGuest() {
  const { data } = await client.post("/auth/guest");
  return data;
}
