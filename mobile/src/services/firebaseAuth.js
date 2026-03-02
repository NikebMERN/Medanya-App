import Constants from "expo-constants";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import {
  signInWithCredential,
  GoogleAuthProvider,
  FacebookAuthProvider,
} from "firebase/auth";
import { auth, firebaseReady } from "../config/firebase";
import { env } from "../utils/env";

WebBrowser.maybeCompleteAuthSession();

/**
 * Expo Go vs Dev Build detection.
 * Use proxy (auth.expo.io) when in Expo Go; custom scheme when in dev/prod builds.
 */
export const isExpoGo = Constants.appOwnership === "expo";

/**
 * Redirect URI for OAuth (expo-auth-session + native token flow).
 *
 * - Expo Go: uses proxy → https://auth.expo.io/@username/slug (add to Google/Facebook consoles)
 * - Dev/Prod build: uses scheme medanya://redirect
 *
 * Uses EXPO_PUBLIC_OAUTH_REDIRECT_URI when set to override.
 */
export function getAppRedirectUri(useProxy = isExpoGo) {
  const fromEnv = env.oauthRedirectUri;
  if (fromEnv) {
    return fromEnv.trim().replace(/\/+$/, "");
  }
  if (useProxy) {
    try {
      return AuthSession.getRedirectUrl();
    } catch (e) {
      // fall through to scheme
    }
  }
  const scheme = Constants.expoConfig?.scheme ?? "medanya";
  return AuthSession.makeRedirectUri({
    scheme,
    path: "redirect",
  });
}

/**
 * Log the redirect URI and mode (add the URI to Google & Facebook consoles).
 */
export function logExpoAuthProxyUrl() {
  // no-op: no terminal output
}

export async function signInWithGoogleCredential(idToken) {
  if (!firebaseReady || !auth) throw new Error("Firebase not configured.");
  if (!idToken) throw new Error("Google ID token is required.");

  const credential = GoogleAuthProvider.credential(idToken);
  const userCred = await signInWithCredential(auth, credential);
  const token = await userCred.user.getIdToken();
  return { user: userCred.user, token };
}

export async function signInWithFacebookCredential(accessToken) {
  if (!firebaseReady || !auth) throw new Error("Firebase not configured.");
  if (!accessToken) throw new Error("Facebook access token is required.");

  const credential = FacebookAuthProvider.credential(accessToken);
  const userCred = await signInWithCredential(auth, credential);
  const token = await userCred.user.getIdToken();
  return { user: userCred.user, token };
}
