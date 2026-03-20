/**
 * Centralized auth configuration (client IDs, scheme, platform helpers).
 * Keep this file free of secrets.
 */
import Constants from "expo-constants";
import { Platform } from "react-native";
import { env } from "../utils/env";

const defaultScheme = "medanya";
const expoScheme = Constants.expoConfig?.scheme ?? defaultScheme;

export const authScheme = expoScheme;

export const authConfig = {
  scheme: expoScheme,
  platform: Platform.OS,
  isWeb: Platform.OS === "web",
  google: {
    webClientId: env.googleWebClientId || "",
    iosClientId: env.googleIosClientId || "",
    androidClientId: env.googleAndroidClientId || "",
    expoClientId: env.googleExpoClientId || "",
  },
  facebook: {
    appId: env.facebookAppId || "",
  },
};

