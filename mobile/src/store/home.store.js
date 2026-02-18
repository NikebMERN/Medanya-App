/**
 * Home screen state: tab, mixed feed items, live streams, cursor, loading/error.
 */
import { create } from "zustand";
import * as feedApi from "../services/feed.api";

export const TABS = [
  { id: "all", label: "All Feed" },
  { id: "alerts", label: "Alerts" },
  { id: "jobs", label: "Jobs" },
  { id: "missing", label: "Missing" },
  { id: "market", label: "Market" },
];

export const useHomeStore = create((set, get) => ({
  selectedTab: "all",
  homeFeedItems: [],
  nextCursor: null,
  liveStreams: [],
  loading: false,
  loadingMore: false,
  refreshing: false,
  error: null,

  setTab: (tab) => set({ selectedTab: tab }),

  refresh: async () => {
    const { selectedTab } = get();
    set({ refreshing: true, error: null, nextCursor: null });
    try {
      const [feedRes, liveRes] = await Promise.all([
        feedApi.getHomeFeed({ tab: selectedTab, limit: 20 }),
        feedApi.getLiveStreams({ limit: 10 }),
      ]);
      set({
        homeFeedItems: feedRes.items ?? [],
        nextCursor: feedRes.nextCursor ?? null,
        liveStreams: liveRes.streams ?? [],
        refreshing: false,
        error: null,
      });
    } catch (e) {
      set({
        error: e?.message ?? "Failed to load feed",
        refreshing: false,
      });
    }
  },

  loadMore: async () => {
    const { selectedTab, nextCursor, loadingMore, loading, homeFeedItems } = get();
    if (loadingMore || loading || !nextCursor) return;
    set({ loadingMore: true, error: null });
    try {
      const res = await feedApi.getHomeFeed({
        tab: selectedTab,
        cursor: nextCursor,
        limit: 20,
      });
      const newItems = res.items ?? [];
      set((s) => ({
        homeFeedItems: [...(s.homeFeedItems ?? []), ...newItems],
        nextCursor: res.nextCursor ?? null,
        loadingMore: false,
      }));
    } catch (e) {
      set({
        error: e?.message ?? "Failed to load more",
        loadingMore: false,
      });
    }
  },

  refreshLiveOnly: async () => {
    try {
      const res = await feedApi.getLiveStreams({ limit: 10 });
      set({ liveStreams: res.streams ?? [] });
    } catch (_) {}
  },

  clear: () =>
    set({
      homeFeedItems: [],
      nextCursor: null,
      loading: false,
      loadingMore: false,
      refreshing: false,
      error: null,
    }),
}));
