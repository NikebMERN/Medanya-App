/**
 * Missing persons module state.
 * Isolated store for missing persons feature.
 */
import { create } from "zustand";

export const useMissingStore = create((set) => ({
  results: [],
  total: 0,
  page: 1,
  loading: false,
  error: null,
  submitting: false,

  setResults: (results, total, page) =>
    set({ results: results ?? [], total: total ?? 0, page: page ?? 1 }),
  setLoading: (loading) => set({ loading: loading ?? false }),
  setError: (error) => set({ error: error ?? null, loading: false }),
  setSubmitting: (submitting) => set({ submitting: submitting ?? false }),

  clear: () =>
    set({ results: [], total: 0, page: 1, loading: false, error: null, submitting: false }),
}));
