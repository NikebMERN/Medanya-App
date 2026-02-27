/**
 * Marketplace module state.
 * Isolated store for marketplace feature.
 */
import { create } from "zustand";
import * as marketplaceApi from "../services/marketplace.api";

export const MARKETPLACE_CATEGORIES = [
  { value: "", label: "All" },
  { value: "electronics", label: "Electronics" },
  { value: "furniture", label: "Furniture" },
  { value: "clothing", label: "Clothing & Accessories" },
  { value: "home_appliances", label: "Home Appliances" },
  { value: "books", label: "Books & Media" },
  { value: "sports", label: "Sports & Outdoors" },
  { value: "toys", label: "Toys & Games" },
  { value: "vehicles", label: "Vehicles & Parts" },
  { value: "jewelry", label: "Jewelry & Watches" },
  { value: "beauty", label: "Beauty & Health" },
  { value: "tools", label: "Tools & Hardware" },
  { value: "garden", label: "Garden & Outdoor" },
  { value: "baby", label: "Baby & Kids" },
  { value: "other", label: "Other (specify)" },
];

export const MARKETPLACE_CATEGORY_OPTIONS = MARKETPLACE_CATEGORIES.filter((c) => c.value);

const LIMIT = 20;

export const useMarketplaceStore = create((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  limit: LIMIT,
  loading: false,
  error: null,
  submitting: false,
  refreshing: false,
  hasMore: true,
  sort: "newest",
  category: "",
  location: "",
  keyword: "",
  viewerId: null,
  currentItem: null,

  setViewerId: (id) => set({ viewerId: id ?? null }),

  setItems: (items, total, page) =>
    set({
      items: items ?? [],
      total: total ?? 0,
      page: page ?? 1,
      loading: false,
      error: null,
      hasMore: ((items ?? []).length < (get().limit || LIMIT)) ? false : true,
    }),
  setLoading: (loading) => set({ loading: loading ?? false }),
  setError: (error) => set({ error: error ?? null, loading: false }),
  setSubmitting: (submitting) => set({ submitting: submitting ?? false }),
  setRefreshing: (refreshing) => set({ refreshing: refreshing ?? false }),
  setFilters: (filters) =>
    set({
      category: filters?.category ?? get().category,
      location: filters?.location ?? get().location,
      keyword: filters?.keyword ?? get().keyword,
      sort: filters?.sort ?? get().sort,
    }),

  fetchItems: async (reset = false, opts = {}) => {
    const { category, location, keyword, sort, page, limit, viewerId } = get();
    const userId = opts.userId ?? viewerId;
    const nextPage = reset ? 1 : page;
    set({ loading: true, error: null, ...(reset && { items: [], page: 1 }) });
    try {
      const params = {
        page: nextPage,
        limit,
        category: category || undefined,
        location: location || undefined,
        sort: sort || "newest",
        includeCreatorPending: !!userId ? "1" : undefined,
      };
      const result = keyword
        ? await marketplaceApi.searchItems({ ...params, q: keyword })
        : await marketplaceApi.listItems(params);
      const items = result.items ?? [];
      const total = result.total ?? 0;
      const newPage = result.page ?? nextPage;
      if (reset) {
        set({ items, total, page: newPage, hasMore: items.length >= limit });
      } else {
        const prev = get().items;
        const merged = newPage === 1 ? items : [...prev, ...items];
        set({
          items: merged,
          total,
          page: newPage,
          hasMore: items.length >= limit,
        });
      }
    } catch (err) {
      set({
        error: err?.response?.data?.error?.message || err?.message || "Failed to load.",
      });
    } finally {
      set({ loading: false, refreshing: false });
    }
  },

  fetchMore: async () => {
    const { loading, hasMore, items, total, limit } = get();
    if (loading || !hasMore || items.length >= total) return;
    set({ page: get().page + 1 });
    await get().fetchItems(false);
  },

  refresh: async () => {
    set({ refreshing: true, page: 1 });
    await get().fetchItems(true);
  },

  fetchListingById: async (id) => {
    if (!id) return null;
    try {
      const item = await marketplaceApi.getItem(id);
      set({ currentItem: item ?? null });
      return item;
    } catch (_) {
      set({ currentItem: null });
      return null;
    }
  },

  createListing: async (payload) => {
    set({ submitting: true, error: null });
    try {
      const item = await marketplaceApi.createItem(payload);
      set({ submitting: false });
      return item;
    } catch (err) {
      set({
        submitting: false,
        error: err?.response?.data?.error?.message || err?.message || "Failed to create.",
      });
      throw err;
    }
  },

  clear: () =>
    set({
      items: [],
      total: 0,
      page: 1,
      loading: false,
      error: null,
      submitting: false,
      refreshing: false,
      hasMore: true,
      currentItem: null,
      viewerId: null,
    }),
}));
