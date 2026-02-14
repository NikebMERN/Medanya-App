/**
 * Community feed module state.
 * Isolated store for feed feature.
 */
import { create } from "zustand";

export const useFeedStore = create((set) => ({
  items: [],
  nextCursor: null,
  loading: false,
  error: null,

  setItems: (items, nextCursor) =>
    set({ items: items ?? [], nextCursor: nextCursor ?? null }),
  appendItems: (items, nextCursor) =>
    set((s) => ({
      items: [...(s.items ?? []), ...(items ?? [])],
      nextCursor: nextCursor ?? null,
    })),
  setLoading: (loading) => set({ loading: loading ?? false }),
  setError: (error) => set({ error: error ?? null, loading: false }),

  clear: () => set({ items: [], nextCursor: null, loading: false, error: null }),
}));
