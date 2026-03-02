/**
 * Validates auth config and returns feature flags + missing keys.
 * Safe: never logs secrets, only env variable names.
 */
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};
const get = (key, envKey) => (extra[key] ?? process.env[envKey] ?? "").trim();

const FIREBASE_KEYS = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
];

const GOOGLE_KEYS = ["EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"];
const FACEBOOK_KEYS = ["EXPO_PUBLIC_FACEBOOK_APP_ID"];

const ENV_MAP = {
  EXPO_PUBLIC_FIREBASE_API_KEY: () => get("firebaseApiKey", "EXPO_PUBLIC_FIREBASE_API_KEY"),
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: () => get("firebaseAuthDomain", "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: () => get("firebaseProjectId", "EXPO_PUBLIC_FIREBASE_PROJECT_ID"),
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: () => get("firebaseStorageBucket", "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: () => get("firebaseMessagingSenderId", "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  EXPO_PUBLIC_FIREBASE_APP_ID: () => get("firebaseAppId", "EXPO_PUBLIC_FIREBASE_APP_ID"),
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: () => get("googleWebClientId", "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"),
  EXPO_PUBLIC_FACEBOOK_APP_ID: () => get("facebookAppId", "EXPO_PUBLIC_FACEBOOK_APP_ID"),
};

function getMissing(keys) {
  return keys.filter((k) => !(ENV_MAP[k]?.() || "").replace(/^["']|["']$/g, ""));
}

export function validateConfig() {
  const missingFirebase = getMissing(FIREBASE_KEYS);
  const missingGoogle = getMissing(GOOGLE_KEYS);
  const missingFacebook = getMissing(FACEBOOK_KEYS);

  const firebaseEnabled = missingFirebase.length === 0;
  const googleEnabled = firebaseEnabled && missingGoogle.length === 0;
  const facebookEnabled = firebaseEnabled && missingFacebook.length === 0;

  const ok = firebaseEnabled;

  return {
    ok,
    missing: {
      firebase: missingFirebase,
      google: firebaseEnabled ? missingGoogle : [...missingFirebase, ...missingGoogle],
      facebook: firebaseEnabled ? missingFacebook : [...missingFirebase, ...missingFacebook],
    },
    flags: {
      firebaseEnabled,
      googleEnabled,
      facebookEnabled,
    },
  };
}
