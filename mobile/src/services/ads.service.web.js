/**
 * Web: AdMob is native-only. No-op implementations.
 */
import { useAdsStore } from "../store/ads.store";

export async function initializeAds() {
  useAdsStore.getState().setAdsReady(false);
  return false;
}

export async function showRewardedAd() {
  return false;
}

export async function showInterstitialAd() {
  // no-op
}
