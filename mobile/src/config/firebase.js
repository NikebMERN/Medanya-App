/**
 * Firebase initialization with native persistence (fixes "missing initial state").
 * - Native (iOS/Android): initializeAuth with getReactNativePersistence(AsyncStorage)
 * - Web: initializeAuth with browserLocalPersistence
 * Single auth instance; authReady resolves after persistence has restored.
 */
import { Platform } from "react-native";
import { initializeApp, getApps } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence, // known Firebase typing bug: may be missing in .d.ts but works at runtime
  browserLocalPersistence,
  browserPopupRedirectResolver,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { firebaseConfig } from "./appConfig";
import { validateConfig } from "./validateConfig";

const { flags } = validateConfig();
const firebaseEnabled = flags.firebaseEnabled;

// React Native AsyncStorage (Firebase's getReactNativePersistence expects this)
const ReactNativeAsyncStorage = AsyncStorage;

let app = null;
let auth = null;

/** Resolves when Firebase Auth has applied persistence (avoids "missing initial state"). */
let authReadyResolve = null;
export const authReady = new Promise((resolve) => {
  authReadyResolve = resolve;
});

if (firebaseEnabled) {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    // Use initializeAuth + persistence (never getAuth here) so session persists after app close
    if (Platform.OS === "web") {
      auth = initializeAuth(app, {
        persistence: browserLocalPersistence,
        popupRedirectResolver: browserPopupRedirectResolver,
      });
    } else {
      // @ts-ignore - getReactNativePersistence exists at runtime; known Firebase typing bug
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });
    }
    // Signal that auth is ready after first persistence restore
    const unsub = auth.onAuthStateChanged(() => {
      if (authReadyResolve) {
        authReadyResolve();
        authReadyResolve = null;
      }
      unsub();
    });
  } else {
    app = getApps()[0];
    // Reuse existing auth instance (initializeAuth can only be called once per app)
    auth = getAuth(app);
    if (authReadyResolve) {
      authReadyResolve();
      authReadyResolve = null;
    }
  }
} else if (typeof __DEV__ !== "undefined" && __DEV__) {
  validateConfig();
}

export { app, auth };
export const firebaseReady = Boolean(app && auth);
/** @deprecated Use firebaseReady from this module or getFeatureFlags() from appConfig */
export const isFirebaseConfigured = firebaseReady;
