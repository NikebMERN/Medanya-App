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
      set({ coinBalance: w?.balance ?? w?.coinBalance ?? 0, earningsBalance: w?.earnings ?? 0, pendingBalance: w?.pending ?? 0, withdrawnBalance: w?.withdrawn ?? 0, loading: false, error: null });
    } catch (e) {
      set({ loading: false, error: e?.message ?? "Failed" });
    }
  },

  fetchHistory: async (params = {}) => {
    try {
      const res = await walletApi.getWalletHistory(params);
      set({ history: res?.transactions ?? [] });
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
