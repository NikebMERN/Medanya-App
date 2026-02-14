/**
 * Marketplace module state.
 * Isolated store for marketplace feature.
 */
import { create } from "zustand";

export const useMarketplaceStore = create((set) => ({
  items: [],
  total: 0,
  page: 1,
  loading: false,
  error: null,
  submitting: false,
  category: "",
  location: "",
  keyword: "",

  setItems: (items, total, page) =>
    set({ items: items ?? [], total: total ?? 0, page: page ?? 1 }),
  setLoading: (loading) => set({ loading: loading ?? false }),
  setError: (error) => set({ error: error ?? null, loading: false }),
  setSubmitting: (submitting) => set({ submitting: submitting ?? false }),
  setFilters: (filters) =>
    set({
      category: filters?.category ?? "",
      location: filters?.location ?? "",
      keyword: filters?.keyword ?? "",
    }),

  clear: () =>
    set({
      items: [],
      total: 0,
      page: 1,
      loading: false,
      error: null,
      submitting: false,
    }),
}));
