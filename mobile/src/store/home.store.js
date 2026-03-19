/**
 * Home screen state: tab, mixed feed items, live streams, cursor, loading/error.
 */
import { create } from "zustand";
import * as feedApi from "../services/feed.api";
import * as livestreamApi from "../api/livestream.api";

export const TABS = [
  { id: "feeds", label: "Feeds", icon: "home" },
  { id: "reports", label: "Reports", icon: "warning" },
  { id: "jobs", label: "Jobs", icon: "work" },
  { id: "missing", label: "Missing", icon: "person-search" },
];

export const useHomeStore = create((set, get) => ({
  selectedTab: "feeds",
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
      const feedPromise =
        selectedTab === "feeds"
          ? feedApi.getPersonalizedFeed({ tab: "feeds", limit: 20 })
          : selectedTab === "reports"
            ? feedApi.getReportsFeed({ limit: 20 })
            : feedApi.getHomeFeed({ tab: selectedTab, limit: 20 });
      const [feedRes, liveRes] = await Promise.all([
        feedPromise,
        livestreamApi.getLiveStreamsFollowing({ limit: 10 }).catch(() => ({ streams: [] })),
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
      const fetchFn =
        selectedTab === "feeds"
          ? () => feedApi.getPersonalizedFeed({ tab: "feeds", cursor: nextCursor, limit: 20 })
          : selectedTab === "reports"
            ? () => feedApi.getReportsFeed({ cursor: nextCursor, limit: 20 })
            : () => feedApi.getHomeFeed({ tab: selectedTab, cursor: nextCursor, limit: 20 });
      const res = await fetchFn();
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
      const res = await livestreamApi.getLiveStreamsFollowing({ limit: 10 });
      set({ liveStreams: res.streams ?? [] });
    } catch (_) {}
  },

  clearError: () => set({ error: null }),

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
