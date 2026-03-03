/**
 * useWatchAdEarn — AdMob RewardedAd integration for Earn Coins task.
 * Shows real ads in dev client / production builds. No simulated ads.
 * When user earns reward => POST /wallet/tasks/claim {type:"WATCH_AD"}.
 *
 * AdMob does NOT work in Expo Go. In Expo Go, shows an informational alert
 * that a development build is required — no fake earning.
 */
import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { showRewardedAd } from "../../../services/ads.service";
import { isExpoGo } from "../../../store/ads.store";
import * as walletApi from "../../wallet/wallet.api";
import { useWalletStore } from "../../wallet/wallet.store";

export function useWatchAdEarn({ onEarned }) {
  const [adLoading, setAdLoading] = useState(false);
  const fetchWallet = useWalletStore((s) => s.fetchWallet);

  const watchAd = useCallback(async () => {
    if (isExpoGo) {
      Alert.alert(
        "Development Build Required",
        "Ads require a development or production build. Run: eas build --profile development, then npx expo start --dev-client"
      );
      return;
    }

    setAdLoading(true);
    try {
      const earned = await showRewardedAd();
      if (earned) {
        const res = await walletApi.claimTask("WATCH_AD", {});
        const reward = res?.reward ?? 12;
        await fetchWallet?.();
        onEarned?.(reward);
        return reward;
      }
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.error?.message ?? e?.message ?? "Failed to claim reward");
    } finally {
      setAdLoading(false);
    }
  }, [onEarned, fetchWallet]);

  return { watchAd, adLoading };
}
