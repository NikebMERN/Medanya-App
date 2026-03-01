/**
 * Short videos module state.
 * Isolated store for videos feature only.
 */
import { create } from "zustand";
import * as videosApi from "../api/videos.api";
import { trackEvent } from "../utils/trackEvent";

export const useVideosStore = create((set, get) => ({
  videos: [],
  page: 1,
  total: 0,
  loading: false,
  loadingMore: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const res = await videosApi.listVideos({ page: 1, limit: 20 });
      set({ videos: res.videos, page: 1, total: res.total, loading: false });
    } catch (e) {
      set({ error: e?.message ?? "Failed to load videos", loading: false });
    }
  },

  loadMore: async () => {
    const { loadingMore, loading, videos, page, total } = get();
    if (loading || loadingMore) return;
    if (videos.length >= total) return;
    set({ loadingMore: true, error: null });
    try {
      const nextPage = page + 1;
      const res = await videosApi.listVideos({ page: nextPage, limit: 20 });
      set((s) => ({
        videos: [...(s.videos ?? []), ...(res.videos ?? [])],
        page: nextPage,
        total: res.total ?? s.total,
        loadingMore: false,
      }));
    } catch (e) {
      set({ error: e?.message ?? "Failed to load more", loadingMore: false });
    }
  },

  optimisticToggleLike: async (videoId, liked, meta = {}) => {
    // optimistic update local list
    set((s) => ({
      videos: (s.videos ?? []).map((v) =>
        String(v._id) === String(videoId)
          ? {
              ...v,
              _optimisticLiked: liked,
              likeCount: Math.max(0, (v.likeCount ?? 0) + (liked ? 1 : -1)),
            }
          : v
      ),
    }));
    try {
      if (liked) {
        await videosApi.likeVideo(videoId);
        trackEvent("video_like", "video", videoId, meta);
      } else {
        await videosApi.unlikeVideo(videoId);
      }
    } catch (_) {
      // revert on failure
      set((s) => ({
        videos: (s.videos ?? []).map((v) =>
          String(v._id) === String(videoId)
            ? {
                ...v,
                _optimisticLiked: !liked,
                likeCount: Math.max(0, (v.likeCount ?? 0) + (!liked ? 1 : -1)),
              }
            : v
        ),
      }));
    }
  },
}));

