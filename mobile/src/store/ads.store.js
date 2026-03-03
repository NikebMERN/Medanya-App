/**
 * Ads store — Zustand flag for ad initialization and availability.
 * AdMob is unavailable in Expo Go; modules can check adsReady before requesting ads.
 */
import { create } from "zustand";
import Constants from "expo-constants";

/** True when ads SDK is initialized; false in Expo Go or on init failure */
export const useAdsStore = create((set) => ({
  adsReady: false,
  setAdsReady: (ready) => set({ adsReady: ready }),
}));

/** AdMob requires a native build — not available in Expo Go */
export const isExpoGo = Constants.appOwnership === "expo";
