/**
 * AdMob Banner component. Uses test IDs in __DEV__, real IDs in production.
 * Renders nothing in Expo Go (ads unavailable).
 */
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { useAdsStore, isExpoGo } from "../../store/ads.store";
import { getBannerAdUnitId } from "../../config/ads.config";

const BANNER_HEIGHT = 50;

export function AdBanner({ style }) {
  const adsReady = useAdsStore((s) => s.adsReady);
  const [BannerAd, setBannerAd] = useState(null);

  useEffect(() => {
    if (isExpoGo || !adsReady) return;
    try {
      const mod = require("react-native-google-mobile-ads");
      if (mod.BannerAd) setBannerAd(() => mod.BannerAd);
    } catch (_) {}
  }, [adsReady]);

  if (isExpoGo || !BannerAd || !adsReady) return null;

  const adUnitId = getBannerAdUnitId();
  if (!adUnitId) return null;

  const { BannerAdSize } = require("react-native-google-mobile-ads");

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: BANNER_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
});
