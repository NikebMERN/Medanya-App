/**
 * Hook to show interstitial ads. Call show() when you want to display.
 */
import { useState, useCallback } from "react";
import { showInterstitialAd } from "../../services/ads.service";

export function useInterstitialAd() {
  const [loading, setLoading] = useState(false);

  const show = useCallback(async () => {
    setLoading(true);
    try {
      await showInterstitialAd();
    } finally {
      setLoading(false);
    }
  }, []);

  return { show, loading };
}
