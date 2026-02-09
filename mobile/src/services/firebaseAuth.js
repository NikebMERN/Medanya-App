import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";
import {
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "../config/firebase";
import { env } from "../utils/env";

WebBrowser.maybeCompleteAuthSession();

/**
 * Get redirect URI for OAuth. Add this exact URL to Google and Facebook:
 * - Google: Cloud Console > Credentials > OAuth 2.0 Client > Authorized redirect URIs
 * - Facebook: App > Facebook Login > Settings > Valid OAuth Redirect URIs
 * In Expo Go the URI is usually exp://YOUR_IP:8081 (e.g. exp://192.168.0.101:8081).
 */
function getRedirectUri() {
  const uri = AuthSession.makeRedirectUri({ useProxy: true });
  if (!uri || uri === "undefined") {
    throw new Error(
      "Redirect URI is empty. Add a scheme in app.json or use a development build."
    );
  }
  return uri;
}

/**
 * PKCE: generate code_verifier (43–128 chars) and code_challenge = base64url(sha256(verifier)).
 */
async function generatePKCE() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let codeVerifier = "";
  const bytes = await Crypto.getRandomBytes(32);
  for (let i = 0; i < 32; i++) {
    codeVerifier += chars[bytes[i] % chars.length];
  }
  const hashBase64 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  const codeChallenge = hashBase64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return { codeVerifier, codeChallenge };
}

/**
 * Sign in with Google using authorization code flow + PKCE, then Firebase.
 */
export async function signInWithGoogle() {
  if (!isFirebaseConfigured) {
    throw new Error(
      "Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* and EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to .env"
    );
  }
  const clientId = env.googleWebClientId;
  if (!clientId) {
    throw new Error(
      "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is required for Google sign-in."
    );
  }

  const redirectUri = getRedirectUri();
  const { codeVerifier, codeChallenge } = await generatePKCE();

  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid profile email",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    }).toString();

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type !== "success" || !result.url) {
    throw new Error("Google sign-in was cancelled or failed.");
  }

  const url = result.url;
  const query = url.includes("?") ? url.split("?")[1].split("#")[0] : "";
  const params = new URLSearchParams(query);
  const code = params.get("code");
  if (!code) {
    const error = params.get("error") || "unknown";
    const desc = params.get("error_description") || "";
    throw new Error(desc ? `Google: ${error} - ${desc}` : `Google: ${error}`);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      code_verifier: codeVerifier,
      client_id: clientId,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Google token exchange failed: ${errText}`);
  }

  const tokenData = await tokenRes.json();
  const idToken = tokenData.id_token;
  if (!idToken) {
    throw new Error("Google did not return an ID token.");
  }

  const credential = GoogleAuthProvider.credential(idToken);
  const userCred = await signInWithCredential(auth, credential);
  const token = await userCred.user.getIdToken();
  return { user: userCred.user, token };
}

/**
 * Sign in with Facebook using OAuth redirect, then Firebase.
 */
export async function signInWithFacebook() {
  if (!isFirebaseConfigured) {
    throw new Error(
      "Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* and EXPO_PUBLIC_FACEBOOK_APP_ID to .env"
    );
  }
  const appId = env.facebookAppId;
  if (!appId) {
    throw new Error(
      "EXPO_PUBLIC_FACEBOOK_APP_ID is required for Facebook sign-in."
    );
  }

  const redirectUri = getRedirectUri();

  const authUrl =
    "https://www.facebook.com/v18.0/dialog/oauth?" +
    new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: "token",
      scope: "email,public_profile",
      display: "touch",
    }).toString();

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type !== "success" || !result.url) {
    throw new Error("Facebook sign-in was cancelled or failed.");
  }

  const url = result.url;
  const fragment = url.includes("#") ? url.split("#")[1] : "";
  const params = new URLSearchParams(fragment);
  const accessToken = params.get("access_token");
  if (!accessToken) {
    const error = params.get("error") || "unknown";
    const desc = params.get("error_description") || "";
    throw new Error(desc ? `Facebook: ${error} - ${desc}` : `Facebook: ${error}`);
  }

  const provider = new OAuthProvider("facebook.com");
  const credential = provider.credential({ accessToken });
  const userCred = await signInWithCredential(auth, credential);
  const token = await userCred.user.getIdToken();
  return { user: userCred.user, token };
}
