import { initializeApp, getApps } from "firebase/app";
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { firebaseConfig } from "./appConfig";
import { validateConfig } from "./validateConfig";

const { flags } = validateConfig();
const firebaseEnabled = flags.firebaseEnabled;

let app = null;
let auth = null;

if (firebaseEnabled) {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } else {
    app = getApps()[0];
    auth = getAuth(app);
  }
} else if (typeof __DEV__ !== "undefined" && __DEV__) {
  validateConfig();
}

export { app, auth };
export const firebaseReady = Boolean(app && auth);
/** @deprecated Use firebaseReady from this module or getFeatureFlags() from appConfig */
export const isFirebaseConfigured = firebaseReady;
