/**
 * Analytics Zustand store — user insights, loading, error, empty states.
 */
import { create } from "zustand";
import * as analyticsApi from "./analytics.api";

export const useAnalyticsStore = create((set, get) => ({
  data: null,
  loading: false,
  error: null,
  range: 28,
  metricsKey: "views",

  setRange: (range) => set({ range: Math.min(90, Math.max(7, range)) }),
  setMetricsKey: (key) => set({ metricsKey: key }),

  fetchUserAnalytics: async (userId, range) => {
    const r = range ?? get().range;
    set({ loading: true, error: null });
    try {
      const data = userId
        ? await analyticsApi.getUserAnalytics(userId, r)
        : await analyticsApi.getMyAnalytics(r);
      set({ data, loading: false, error: null });
      return data;
    } catch (e) {
      const msg = e?.response?.data?.error?.message ?? e?.message ?? "Failed to load insights";
      set({ loading: false, error: msg, data: null });
      throw e;
    }
  },

  reset: () => set({ data: null, error: null }),
}));
