/**
 * AdMob ad unit IDs.
 * - In __DEV__: always use Google test IDs (AdMob policy requirement).
 * - In production: use real ad unit IDs from env.
 *
 * AdMob does NOT work in Expo Go — requires EAS dev client or production build.
 */
import { Platform } from "react-native";

const TEST_BANNER_ANDROID = "ca-app-pub-3940256099942544/6300978111";
const TEST_BANNER_IOS = "ca-app-pub-3940256099942544/2934735716";
const TEST_INTERSTITIAL_ANDROID = "ca-app-pub-3940256099942544/1033173712";
const TEST_INTERSTITIAL_IOS = "ca-app-pub-3940256099942544/4411468910";
const TEST_REWARDED_ANDROID = "ca-app-pub-3940256099942544/5224354917";
const TEST_REWARDED_IOS = "ca-app-pub-3940256099942544/1712485313";

function getEnv(key) {
  try {
    return typeof process !== "undefined" ? process.env?.[key] : undefined;
  } catch {
    return undefined;
  }
}

/** Get ad unit ID: test in dev, real in production */
export function getBannerAdUnitId() {
  if (__DEV__) return Platform.OS === "ios" ? TEST_BANNER_IOS : TEST_BANNER_ANDROID;
  const ios = getEnv("EXPO_PUBLIC_ADMOB_BANNER_ID_IOS");
  const android = getEnv("EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID");
  const fallback = getEnv("EXPO_PUBLIC_ADMOB_BANNER_ID");
  return Platform.OS === "ios" ? (ios || fallback) : (android || fallback);
}

export function getInterstitialAdUnitId() {
  if (__DEV__) return Platform.OS === "ios" ? TEST_INTERSTITIAL_IOS : TEST_INTERSTITIAL_ANDROID;
  const ios = getEnv("EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS");
  const android = getEnv("EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_ANDROID");
  const fallback = getEnv("EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID");
  return Platform.OS === "ios" ? (ios || fallback) : (android || fallback);
}

export function getRewardedAdUnitId() {
  if (__DEV__) return Platform.OS === "ios" ? TEST_REWARDED_IOS : TEST_REWARDED_ANDROID;
  const ios = getEnv("EXPO_PUBLIC_ADMOB_REWARDED_ID_IOS");
  const android = getEnv("EXPO_PUBLIC_ADMOB_REWARDED_ID_ANDROID");
  const fallback = getEnv("EXPO_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID") || getEnv("EXPO_PUBLIC_ADMOB_REWARDED_ID");
  return Platform.OS === "ios" ? (ios || fallback) : (android || fallback);
}
