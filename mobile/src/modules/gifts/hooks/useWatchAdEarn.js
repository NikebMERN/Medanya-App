/**
 * useWatchAdEarn — AdMob RewardedAd integration for Earn Coins task.
 * When ad completes => POST /wallet/tasks/claim {type:"WATCH_AD"}.
 * Anti-fraud: server validates; daily caps enforced by backend.
 * Set EXPO_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID in .env for production.
 *
 * In Expo Go: AdMob native module is unavailable — uses dev fallback.
 * Run `npx expo run:ios` or `npx expo run:android` (dev build) to show real ads.
 */
import { useState, useCallback } from "react";
import { Platform, Alert } from "react-native";
import Constants from "expo-constants";
import { env } from "../../../utils/env";
import * as walletApi from "../../wallet/wallet.api";
import { useWalletStore } from "../../wallet/wallet.store";

const TEST_REWARDED_ANDROID = "ca-app-pub-3940256099942544/5224354917";
const TEST_REWARDED_IOS = "ca-app-pub-3940256099942544/1712485313";

/** AdMob requires native build — not available in Expo Go */
const isExpoGo = Constants.appOwnership === "expo";

async function runDevFallback(onEarned, fetchWallet) {
  return new Promise((resolve, reject) => {
    Alert.alert(
      isExpoGo ? "Development Build Required" : "Ad Unavailable",
      isExpoGo
        ? "Real ads require a development build. Run: npx expo run:ios (or run:android). Simulating for now — tap OK to earn coins."
        : "Ad failed to load. Simulating — tap OK to earn coins.",
      [{ text: "OK", onPress: async () => {
        try {
          const res = await walletApi.claimTask("WATCH_AD", {});
          const reward = res?.reward ?? 12;
          await fetchWallet?.();
          onEarned?.(reward);
          resolve(reward);
        } catch (e) {
          reject(e);
        }
      } }]
    );
  });
}

export function useWatchAdEarn({ onEarned }) {
  const [adLoading, setAdLoading] = useState(false);
  const fetchWallet = useWalletStore((s) => s.fetchWallet);

  const watchAd = useCallback(async () => {
    setAdLoading(true);
    try {
      let adWatched = false;

      if (isExpoGo) {
        return await runDevFallback(onEarned, fetchWallet);
      }

      try {
        const { RewardedAd, RewardedAdEventType, AdEventType, TestIds } = require("react-native-google-mobile-ads");
        const testUnit = Platform.OS === "ios" ? TEST_REWARDED_IOS : TEST_REWARDED_ANDROID;
        const adUnit = env.admobRewardedAdUnitId || TestIds?.REWARDED || testUnit;
        const ad = RewardedAd.createForAdRequest(adUnit);
        adWatched = await new Promise((resolve) => {
          let settled = false;
          const finish = (v) => { if (!settled) { settled = true; resolve(v); } };
          const unloadLoaded = ad.addAdEventListener?.(RewardedAdEventType.LOADED, async () => {
            try {
              await ad.show();
            } catch { finish(false); }
          });
          const unloadReward = ad.addAdEventListener?.(RewardedAdEventType.EARNED_REWARD, () => finish(true));
          const unloadClosed = ad.addAdEventListener?.(AdEventType.CLOSED, () => finish(false));
          ad.load();
          setTimeout(() => {
            unloadLoaded?.();
            unloadReward?.();
            unloadClosed?.();
            if (!settled) finish(false);
          }, 20000);
        });
      } catch (_) {
        // Fallback when native module missing (e.g. dev client without AdMob)
        return await runDevFallback(onEarned, fetchWallet);
      }

      if (adWatched) {
        const res = await walletApi.claimTask("WATCH_AD", {});
        const reward = res?.reward ?? 12;
        await fetchWallet?.();
        onEarned?.(reward);
        return reward;
      }
    } finally {
      setAdLoading(false);
    }
  }, [onEarned, fetchWallet]);

  return { watchAd, adLoading };
}
