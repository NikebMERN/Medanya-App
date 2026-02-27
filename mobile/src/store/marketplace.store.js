/**
 * Marketplace module state.
 * Isolated store for marketplace feature.
 */
import { create } from "zustand";

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
