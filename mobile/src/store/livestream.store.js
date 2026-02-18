import { create } from "zustand";
import * as livestreamApi from "../api/livestream.api";

export const useLivestreamStore = create((set, get) => ({
  streams: [],
  page: 1,
  total: 0,
  loading: false,
  loadingMore: false,
  error: null,
  gifts: [],

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const res = await livestreamApi.listStreams({ page: 1, limit: 20 });
      set({ streams: res.streams, page: 1, total: res.total, loading: false });
    } catch (e) {
      set({ error: e?.response?.data?.error?.message ?? e?.message ?? "Failed to load streams", loading: false });
    }
  },

  loadMore: async () => {
    const { loadingMore, loading, streams, page, total } = get();
    if (loading || loadingMore) return;
    if (streams.length >= total) return;
    set({ loadingMore: true, error: null });
    try {
      const nextPage = page + 1;
      const res = await livestreamApi.listStreams({ page: nextPage, limit: 20 });
      set((s) => ({
        streams: [...(s.streams ?? []), ...(res.streams ?? [])],
        page: nextPage,
        total: res.total ?? s.total,
        loadingMore: false,
      }));
    } catch (e) {
      set({ error: e?.message ?? "Failed to load more", loadingMore: false });
    }
  },

  fetchGifts: async () => {
    try {
      const gifts = await livestreamApi.getGiftCatalog();
      set({ gifts: gifts ?? [] });
      return gifts;
    } catch (e) {
      set({ gifts: [] });
      return [];
    }
  },

  createStream: async (body) => {
    set({ error: null });
    try {
      const stream = await livestreamApi.createStream(body);
      return { stream, error: null };
    } catch (e) {
      const msg = e?.response?.data?.error?.message ?? e?.message ?? "Failed to create stream";
      set({ error: msg });
      return { stream: null, error: msg };
    }
  },

  getToken: async (streamId) => {
    try {
      return await livestreamApi.getStreamToken(streamId);
    } catch (e) {
      throw e;
    }
  },

  endStream: async (streamId) => {
    try {
      const stream = await livestreamApi.endStream(streamId);
      set((s) => ({
        streams: (s.streams ?? []).map((x) => (String(x._id) === String(streamId) ? { ...x, ...stream } : x)),
      }));
      return { stream, error: null };
    } catch (e) {
      const msg = e?.response?.data?.error?.message ?? e?.message ?? "Failed to end stream";
      return { stream: null, error: msg };
    }
  },

  setViewerCount: (streamId, viewerCount) => {
    set((s) => ({
      streams: (s.streams ?? []).map((x) =>
        String(x._id) === String(streamId) ? { ...x, viewerCount } : x
      ),
    }));
  },
}));
