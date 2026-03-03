/**
 * Hook to show rewarded ads. Returns show() and loading state.
 * Use show({ onEarned }) to get a callback when user earns the reward.
 */
import { useState, useCallback } from "react";
import { showRewardedAd } from "../../services/ads.service";

export function useRewardedAd() {
  const [loading, setLoading] = useState(false);

  const show = useCallback(async (opts = {}) => {
    const { onEarned } = opts;
    setLoading(true);
    try {
      const earned = await showRewardedAd(onEarned);
      return earned;
    } finally {
      setLoading(false);
    }
  }, []);

  return { show, loading };
}
