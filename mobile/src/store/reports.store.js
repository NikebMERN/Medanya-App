/**
 * Reports & Blacklist module state.
 * Isolated store for reports/blacklist feature.
 */
import { create } from "zustand";

export const useReportsStore = create((set, get) => ({
  reports: [],
  blacklistResults: [],
  blacklistPage: 1,
  blacklistTotal: 0,
  loading: false,
  error: null,
  submitting: false,

  setReports: (reports) => set({ reports: reports ?? [] }),
  setBlacklistResults: (results, page, total) =>
    set({
      blacklistResults: results ?? [],
      blacklistPage: page ?? 1,
      blacklistTotal: total ?? 0,
    }),
  setLoading: (loading) => set({ loading: loading ?? false }),
  setError: (error) => set({ error: error ?? null, loading: false }),
  setSubmitting: (submitting) => set({ submitting: submitting ?? false }),

  clear: () =>
    set({
      reports: [],
      blacklistResults: [],
      blacklistPage: 1,
      blacklistTotal: 0,
      loading: false,
      error: null,
      submitting: false,
    }),
}));
