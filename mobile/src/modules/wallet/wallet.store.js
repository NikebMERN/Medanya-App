/**
 * Wallet Zustand store — MedCoins balance, earnings, tasks, referral.
 */
import { create } from "zustand";
import * as walletApi from "./wallet.api";

export const useWalletStore = create((set, get) => ({
  coinBalance: 0,
  earningsBalance: 0,
  pendingBalance: 0,
  withdrawnBalance: 0,
  history: [],
  tasksProgress: [],
  referralStats: { code: "", invited: 0, eligible: 0, earned: 0 },
  loading: false,
  error: null,

  fetchWallet: async () => {
    set({ loading: true, error: null });
    try {
      const data = await walletApi.getWalletMe();
      const w = data?.wallet ?? data;
      set((s) => ({
        coinBalance: w?.balance ?? w?.coinBalance ?? 0,
        earningsBalance: w?.earnings != null ? w.earnings : s.earningsBalance,
        pendingBalance: w?.pending ?? 0,
        withdrawnBalance: w?.withdrawn ?? 0,
        loading: false,
        error: null,
      }));
    } catch (e) {
      set({ loading: false, error: e?.message ?? "Failed" });
    }
  },

  fetchHistory: async (params = {}) => {
    try {
      const res = await walletApi.getWalletHistory(params);
      const history = res?.transactions ?? [];
      // Earnings = only tasks + gifts/donations (NOT purchased/recharged)
      const earnedFromHistory = history
        .filter((t) => {
          if (t.type === "earn" || t.type === "commission") return true;
          if (t.type === "credit" && t.reference_type === "task") return true;
          if (t.type === "gift_earn") return true;
          return false;
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      set({ history, earningsBalance: earnedFromHistory });
      return res;
    } catch (e) {
      set({ history: [] });
      throw e;
    }
  },

  fetchTasks: async () => {
    try {
      const data = await walletApi.getTasks();
      set({ tasksProgress: data?.tasks ?? [] });
      return data;
    } catch (e) {
      set({ tasksProgress: [] });
      throw e;
    }
  },

  fetchReferralStats: async () => {
    try {
      const stats = await walletApi.getReferralStats();
      set({ referralStats: stats });
      return stats;
    } catch (e) {
      return get().referralStats;
    }
  },

  updateBalanceAfterBoost: (spent) => set((s) => ({ coinBalance: Math.max(0, (s.coinBalance ?? 0) - spent) })),
  updateBalanceAfterRecharge: (added) => set((s) => ({ coinBalance: (s.coinBalance ?? 0) + added })),
}));
