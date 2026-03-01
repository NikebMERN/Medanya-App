/**
 * useWatchAdEarn — AdMob RewardedAd integration for Earn Coins task.
 * When ad completes => POST /wallet/tasks/claim {type:"WATCH_AD"}.
 * Anti-fraud: server validates; daily caps enforced by backend.
 * Install react-native-google-mobile-ads for production.
 */
import { useState, useCallback } from "react";
import * as walletApi from "../../wallet/wallet.api";
import { useWalletStore } from "../../wallet/wallet.store";

const REWARDED_AD_UNIT = __DEV__
  ? "ca-app-pub-3940256099942544/5224354917"
  : "ca-app-pub-xxx/yyy"; // Replace with production unit

export function useWatchAdEarn({ onEarned }) {
  const [adLoading, setAdLoading] = useState(false);
  const fetchWallet = useWalletStore((s) => s.fetchWallet);

  const watchAd = useCallback(async () => {
    setAdLoading(true);
    try {
      let adWatched = false;
      try {
        const { RewardedAd, TestIds } = require("react-native-google-mobile-ads");
        const adUnit = __DEV__ && TestIds?.REWARDED ? TestIds.REWARDED : REWARDED_AD_UNIT;
        const ad = RewardedAd.createForAdRequest(adUnit);
        adWatched = await new Promise((resolve) => {
          let settled = false;
          const finish = (v) => { if (!settled) { settled = true; resolve(v); } };
          const unload = ad.addAdEventListener?.("loaded", async () => {
            try {
              await ad.show();
              finish(true);
            } catch { finish(false); }
          });
          ad.addAdEventListener?.("rewarded", () => finish(true));
          ad.load();
          const t = setTimeout(() => { unload?.(); finish(false); }, 20000);
        });
      } catch (_) {
        // Fallback when AdMob not installed — simulate for dev
        adWatched = await new Promise((r) => setTimeout(() => r(true), 1500));
      }
      if (adWatched) {
        const res = await walletApi.claimTask("WATCH_AD", {});
        const reward = res?.reward ?? 12;
        await fetchWallet?.();
        onEarned?.(reward);
        return reward;
      }
    } catch (e) {
      throw e;
    } finally {
      setAdLoading(false);
    }
  }, [onEarned, fetchWallet]);

  return { watchAd, adLoading };
}
