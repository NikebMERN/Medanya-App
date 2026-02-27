/**
 * Jobs module state: list, search filters, loading.
 * Isolated store for jobs feature.
 */
import { create } from "zustand";
import * as jobsApi from "../services/jobs.api";

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
  { value: "carpenter", label: "Carpenter" },
  { value: "handyman", label: "Handyman" },
  { value: "tutor", label: "Tutor" },
  { value: "pet_care", label: "Pet Care" },
  { value: "laundry", label: "Laundry" },
  { value: "waiter", label: "Waiter" },
  { value: "chef", label: "Chef" },
  { value: "other", label: "Other (specify)" },
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

const LIMIT = 20;

export const useJobsStore = create((set, get) => ({
  jobs: [],
  total: 0,
  page: 1,
  limit: LIMIT,
  loading: false,
  error: null,
  refreshing: false,
  hasMore: true,
  sort: "newest",
  category: "",
  location: "",
  keyword: "",
  viewerId: null,
  currentJob: null,

  setViewerId: (id) => set({ viewerId: id ?? null }),

  setJobs: (jobs, total, page) =>
    set({
      jobs: jobs ?? [],
      total: total ?? 0,
      page: page ?? 1,
      loading: false,
      error: null,
      hasMore: ((jobs ?? []).length < (get().limit || LIMIT)) ? false : true,
    }),

  setLoading: (loading) => set({ loading: loading ?? false }),
  setError: (error) => set({ error: error ?? null, loading: false }),
  setRefreshing: (refreshing) => set({ refreshing: refreshing ?? false }),
  setFilters: (filters) =>
    set({
      category: filters?.category ?? get().category,
      location: filters?.location ?? get().location,
      keyword: filters?.keyword ?? get().keyword,
      sort: filters?.sort ?? get().sort,
    }),

  fetchJobs: async (reset = false, opts = {}) => {
    const { category, location, keyword, sort, page, limit, viewerId } = get();
    const userId = opts.userId ?? viewerId;
    const nextPage = reset ? 1 : page;
    set({ loading: true, error: null, ...(reset && { jobs: [], page: 1 }) });
    try {
      const params = {
        page: nextPage,
        limit,
        category: category || undefined,
        location: location || undefined,
        keyword: keyword || undefined,
        q: keyword || undefined,
        sort: sort || "newest",
        includeCreatorPending: !!userId ? "1" : undefined,
      };
      const result = keyword
        ? await jobsApi.searchJobs(params)
        : await jobsApi.listJobs(params);
      const jobs = result.jobs ?? [];
      const total = result.total ?? 0;
      const newPage = result.page ?? nextPage;
      if (reset) {
        set({ jobs, total, page: newPage, hasMore: jobs.length >= limit });
      } else {
        const prev = get().jobs;
        const merged = newPage === 1 ? jobs : [...prev, ...jobs];
        set({
          jobs: merged,
          total,
          page: newPage,
          hasMore: jobs.length >= limit,
        });
      }
    } catch (err) {
      set({
        error: err?.response?.data?.error?.message || err?.message || "Failed to load jobs.",
      });
    } finally {
      set({ loading: false, refreshing: false });
    }
  },

  fetchMore: async () => {
    const { loading, hasMore, jobs, total, limit } = get();
    if (loading || !hasMore || jobs.length >= total) return;
    set({ page: get().page + 1 });
    await get().fetchJobs(false);
  },

  refresh: async () => {
    set({ refreshing: true, page: 1 });
    await get().fetchJobs(true);
  },

  fetchJobById: async (id) => {
    if (!id) return null;
    try {
      const job = await jobsApi.getJob(id);
      set({ currentJob: job ?? null });
      return job;
    } catch (_) {
      set({ currentJob: null });
      return null;
    }
  },

  createJob: async (payload) => {
    set({ error: null });
    try {
      const job = await jobsApi.createJob(payload);
      return job;
    } catch (err) {
      set({
        error: err?.response?.data?.error?.message || err?.message || "Failed to create job.",
      });
      throw err;
    }
  },

  clear: () =>
    set({
      jobs: [],
      total: 0,
      page: 1,
      loading: false,
      error: null,
      refreshing: false,
      hasMore: true,
      currentJob: null,
      viewerId: null,
    }),
}));
