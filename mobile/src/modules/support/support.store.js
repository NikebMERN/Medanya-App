/**
 * Support (Boost) store — selected amount, mode, recent boosts.
 */
import { create } from "zustand";

export const useSupportStore = create((set) => ({
  selectedAmount: 100,
  mode: "ruler", // "ruler" | "manual"
  recentBoosts: [],

  setSelectedAmount: (amount) => set({ selectedAmount: Math.max(1, Math.min(99999, amount)) }),
  setMode: (mode) => set({ mode: mode === "manual" ? "manual" : "ruler" }),
  addRecentBoost: (boost) =>
    set((s) => ({
      recentBoosts: [boost, ...(s.recentBoosts ?? []).slice(0, 9)],
    })),
}));
