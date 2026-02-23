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
  { value: "cook", label: "Cook" },
  { value: "babysitter", label: "Babysitter" },
  { value: "elderly_care", label: "Elderly Care" },
  { value: "gardener", label: "Gardener" },
  { value: "security", label: "Security" },
  { value: "receptionist", label: "Receptionist" },
  { value: "sales", label: "Sales" },
  { value: "delivery", label: "Delivery" },
  { value: "mechanic", label: "Mechanic" },
  { value: "electrician", label: "Electrician" },
  { value: "plumber", label: "Plumber" },
  { value: "painter", label: "Painter" },
  { value: "other", label: "Others" },
];

export const JOB_CATEGORY_OPTIONS = JOB_CATEGORIES.filter((c) => c.value);

export const CURRENCY_OPTIONS = [
  { value: "ETB", label: "ETB (Birr)" },
  { value: "USD", label: "USD" },
  { value: "AED", label: "AED (Dirham)" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "SAR", label: "SAR (Riyal)" },
  { value: "KES", label: "KES (Shilling)" },
  { value: "NGN", label: "NGN (Naira)" },
  { value: "EGP", label: "EGP (Pound)" },
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
