import Constants from "expo-constants";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import {
  signInWithCredential,
  GoogleAuthProvider,
  FacebookAuthProvider,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "../config/firebase";
import { env } from "../utils/env";

WebBrowser.maybeCompleteAuthSession();

/**
 * Redirect URI for OAuth (expo-auth-session + native token flow).
 *
 * Uses EXPO_PUBLIC_OAUTH_REDIRECT_URI when set (e.g. medanya://redirect).
 * Fallback: app scheme via makeRedirectUri.
 *
 * For mobile: use a scheme-based URI (medanya://redirect) so the browser returns to the app.
 * Add the same URI in Google Cloud Console and Facebook → Valid OAuth Redirect URIs.
 */
export function getAppRedirectUri() {
  const fromEnv = env.oauthRedirectUri;
  if (fromEnv) {
    return fromEnv.trim().replace(/\/+$/, "");
  }
  const scheme = Constants.expoConfig?.scheme ?? "medanya";
  return AuthSession.makeRedirectUri({
    scheme,
    path: "redirect",
  });
}

/**
 * Log the redirect URI (add this exact URL in Google & Facebook consoles).
 */
export function logExpoAuthProxyUrl() {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    const uri = getAppRedirectUri();
    console.log("OAuth redirect URI (add in Google & Facebook consoles):", uri);
  }
}

export async function signInWithGoogleCredential(idToken) {
  if (!isFirebaseConfigured) throw new Error("Firebase not configured.");
  if (!idToken) throw new Error("Google ID token is required.");

  const credential = GoogleAuthProvider.credential(idToken);
  const userCred = await signInWithCredential(auth, credential);
  const token = await userCred.user.getIdToken();
  return { user: userCred.user, token };
}

export async function signInWithFacebookCredential(accessToken) {
  if (!isFirebaseConfigured) throw new Error("Firebase not configured.");
  if (!accessToken) throw new Error("Facebook access token is required.");

  const credential = FacebookAuthProvider.credential(accessToken);
  const userCred = await signInWithCredential(auth, credential);
  const token = await userCred.user.getIdToken();
  return { user: userCred.user, token };
}
