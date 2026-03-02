/**
 * Central auth config — reads from process.env / extra.
 * Use validateConfig() for feature flags.
 */
import Constants from "expo-constants";
import { validateConfig } from "./validateConfig";

const extra = Constants.expoConfig?.extra ?? {};
const get = (key, envKey) => (extra[key] ?? process.env[envKey] ?? "").trim();

export const firebaseConfig = {
  apiKey: get("firebaseApiKey", "EXPO_PUBLIC_FIREBASE_API_KEY"),
  authDomain: get("firebaseAuthDomain", "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: get("firebaseProjectId", "EXPO_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: get("firebaseStorageBucket", "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: get("firebaseMessagingSenderId", "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: get("firebaseAppId", "EXPO_PUBLIC_FIREBASE_APP_ID"),
};

export const googleConfig = {
  webClientId: get("googleWebClientId", "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"),
  expoClientId: get("googleExpoClientId", "EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID") || undefined,
  iosClientId: get("googleIosClientId", "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID") || undefined,
  androidClientId: get("googleAndroidClientId", "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID") || undefined,
};

export const facebookConfig = {
  appId: get("facebookAppId", "EXPO_PUBLIC_FACEBOOK_APP_ID"),
};

export function getFeatureFlags() {
  const { flags } = validateConfig();
  return flags;
}
