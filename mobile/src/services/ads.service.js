/**
 * AdMob service — initialize SDK, show rewarded/interstitial ads.
 * Uses test IDs in __DEV__, real IDs in production (see ads.config.js).
 * AdMob does NOT work in Expo Go — requires EAS dev client or production build.
 *
 * Consent: iOS ATT prompt before init; GDPR/EEA consent form via AdsConsent when required.
 */
import { Platform } from "react-native";
import { useAdsStore, isExpoGo } from "../store/ads.store";
import { getRewardedAdUnitId, getInterstitialAdUnitId } from "../config/ads.config";

let initPromise = null;

/** Request iOS ATT permission before loading ads (required by Apple) */
async function requestTrackingIfNeeded() {
  if (Platform.OS !== "ios") return;
  try {
    const { getTrackingPermissionsAsync, requestTrackingPermissionsAsync } = require("expo-tracking-transparency");
    const { PermissionStatus } = require("expo-tracking-transparency");
    const { status } = await getTrackingPermissionsAsync();
    if (status === PermissionStatus.UNDETERMINED) {
      await requestTrackingPermissionsAsync();
    }
  } catch (_) {}
}

/** Show GDPR consent form if user is in EEA and consent required */
async function requestConsentIfNeeded() {
  if (isExpoGo) return;
  try {
    const { AdsConsent } = require("react-native-google-mobile-ads");
    await AdsConsent.loadAndShowConsentFormIfRequired();
  } catch (_) {}
}

/**
 * Initialize AdMob. Safe to call multiple times. Resolves to false in Expo Go.
 * Runs ATT (iOS) and GDPR consent before init.
 */
export async function initializeAds() {
  if (isExpoGo) {
    useAdsStore.getState().setAdsReady(false);
    return false;
  }
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      await requestTrackingIfNeeded();
      await requestConsentIfNeeded();
      const { mobileAds } = require("react-native-google-mobile-ads");
      await mobileAds().initialize();
      useAdsStore.getState().setAdsReady(true);
      return true;
    } catch (e) {
      console.warn("[Ads] Init failed:", e?.message ?? e);
      useAdsStore.getState().setAdsReady(false);
      return false;
    }
  })();
  return initPromise;
}

/**
 * Show a rewarded ad. Returns true if user earned reward, false otherwise.
 * @param {Function} [onEarned] Called when user earns the reward (optional).
 */
export async function showRewardedAd(onEarned) {
  if (isExpoGo) return false;
  try {
    const { RewardedAd, RewardedAdEventType, AdEventType } = require("react-native-google-mobile-ads");
    const adUnitId = getRewardedAdUnitId();
    const ad = RewardedAd.createForAdRequest(adUnitId);
    return await new Promise((resolve) => {
      let settled = false;
      const finish = (v) => {
        if (!settled) {
          settled = true;
          resolve(v);
        }
      };
      const unloadLoaded = ad.addAdEventListener?.(RewardedAdEventType.LOADED, async () => {
        try {
          await ad.show();
        } catch {
          finish(false);
        }
      });
      const unloadReward = ad.addAdEventListener?.(RewardedAdEventType.EARNED_REWARD, () => {
        onEarned?.();
        finish(true);
      });
      const unloadClosed = ad.addAdEventListener?.(AdEventType.CLOSED, () => finish(false));
      ad.load();
      setTimeout(() => {
        unloadLoaded?.();
        unloadReward?.();
        unloadClosed?.();
        if (!settled) finish(false);
      }, 20000);
    });
  } catch (e) {
    console.warn("[Ads] Rewarded ad error:", e?.message ?? e);
    return false;
  }
}

/**
 * Show an interstitial ad. Resolves when ad is closed (no reward).
 */
export async function showInterstitialAd() {
  if (isExpoGo) return;
  try {
    const { InterstitialAd, AdEventType } = require("react-native-google-mobile-ads");
    const adUnitId = getInterstitialAdUnitId();
    const ad = InterstitialAd.createForAdRequest(adUnitId);
    await new Promise((resolve, reject) => {
      let settled = false;
      const finish = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      const fail = (err) => {
        if (!settled) {
          settled = true;
          reject(err ?? new Error("Interstitial failed"));
        }
      };
      const unloadLoaded = ad.addAdEventListener?.(AdEventType.LOADED, async () => {
        try {
          await ad.show();
        } catch (e) {
          fail(e);
        }
      });
      const unloadClosed = ad.addAdEventListener?.(AdEventType.CLOSED, finish);
      const unloadError = ad.addAdEventListener?.(AdEventType.ERROR, (e) => fail(e));
      ad.load();
      setTimeout(() => {
        unloadLoaded?.();
        unloadClosed?.();
        unloadError?.();
        if (!settled) fail(new Error("Interstitial load timeout"));
      }, 15000);
    });
  } catch (e) {
    console.warn("[Ads] Interstitial ad error:", e?.message ?? e);
  }
}
