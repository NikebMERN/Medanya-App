import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { env } from "../utils/env";

const firebaseConfig = {
  apiKey: env.firebaseApiKey,
  authDomain: env.firebaseAuthDomain,
  projectId: env.firebaseProjectId,
  storageBucket: env.firebaseStorageBucket,
  messagingSenderId: env.firebaseMessagingSenderId,
  appId: env.firebaseAppId,
};

let app = null;
let auth = null;

if (env.firebaseApiKey && env.firebaseProjectId) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
}

export { app, auth };
export const isFirebaseConfigured = Boolean(app && auth);
