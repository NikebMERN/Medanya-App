import { Platform } from "react-native";
import Constants from "expo-constants";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import {
  signInWithCredential,
  signInAnonymously,
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

function getWebAppHomepage() {
  if (env.webAppUrl) return env.webAppUrl;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://medanya.app";
}

/**
 * Redirect URI for OAuth (expo-auth-session / web).
 * - Web: App homepage (e.g. https://medanya.app or http://localhost:19006). Add this in Google/Facebook and Firebase Authorized domains.
 * - Native: Expo proxy or custom scheme — never the Firebase handler (breaks mobile flows).
 */
export function getAppRedirectUri() {
  if (Platform.OS === "web") {
    return getWebAppHomepage();
  }

  const fromEnv = env.oauthRedirectUri;
  const trimmed = fromEnv?.trim().replace(/\/+$/, "") ?? "";
  if (trimmed && !trimmed.includes("firebaseapp.com/__/auth/handler")) {
    return trimmed;
  }
  try {
    return AuthSession.getRedirectUrl();
  } catch (e) {
    // fallback if getRedirectUrl fails
  }
  const scheme = Constants.expoConfig?.scheme ?? "medanya";
  return AuthSession.makeRedirectUri({ scheme, path: "redirect" });
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

/**
 * Sign in anonymously with Firebase. Returns idToken for backend auth.
 * Reuses existing anonymous session if already signed in (persisted across app restarts).
 */
export async function signInAnonymouslyAndGetToken() {
  if (!firebaseReady || !auth) throw new Error("Firebase not configured.");

  let fbUser = auth.currentUser;
  if (fbUser?.isAnonymous) {
    const token = await fbUser.getIdToken(true);
    return token;
  }
  const userCred = await signInAnonymously(auth);
  const token = await userCred.user.getIdToken();
  return token;
}
