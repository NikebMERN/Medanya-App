/**
 * Jobs module state: list, search filters, loading.
 * Isolated store for jobs feature.
 */
import { create } from "zustand";

export const JOB_CATEGORIES = [
  { value: "", label: "All" },
  { value: "housemaid", label: "Housemaid" },
  { value: "cleaner", label: "Cleaner" },
  { value: "driver", label: "Driver" },
  { value: "nanny", label: "Nanny" },
];

export const useJobsStore = create((set, get) => ({
  jobs: [],
  total: 0,
  page: 1,
  limit: 20,
  loading: false,
  error: null,
  category: "",
  location: "",
  keyword: "",

  setJobs: (jobs, total, page) =>
    set({
      jobs: jobs ?? [],
      total: total ?? 0,
      page: page ?? 1,
      loading: false,
      error: null,
    }),

  setLoading: (loading) => set({ loading: loading ?? false }),

  setError: (error) => set({ error: error ?? null, loading: false }),

  setFilters: (filters) =>
    set({
      category: filters?.category ?? get().category,
      location: filters?.location ?? get().location,
      keyword: filters?.keyword ?? get().keyword,
    }),

  clear: () =>
    set({
      jobs: [],
      total: 0,
      page: 1,
      loading: false,
      error: null,
    }),
}));
