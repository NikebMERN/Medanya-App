import { create } from "zustand";
import * as superlikeApi from "../api/superlike.api";

export const useSuperlikeStore = create((set, get) => ({
  balance: 0,
  loading: false,
  error: null,

  fetchBalance: async () => {
    set({ loading: true, error: null });
    try {
      const balance = await superlikeApi.getSuperlikeBalance();
      set({ balance, loading: false });
      return balance;
    } catch (e) {
      set({
        error: e?.response?.data?.error?.message ?? e?.message ?? "Failed to fetch balance",
        loading: false,
      });
      throw e;
    }
  },

  earnWelcome: async () => {
    set({ loading: true, error: null });
    try {
      const data = await superlikeApi.earnWelcome();
      set({ balance: data?.balance ?? get().balance, loading: false });
      return data;
    } catch (e) {
      set({ loading: false, error: e?.response?.data?.error?.message ?? e?.message });
      throw e;
    }
  },

  earnAd: async () => {
    set({ loading: true, error: null });
    try {
      const data = await superlikeApi.earnAd();
      set({ balance: data?.balance ?? get().balance, loading: false });
      return data;
    } catch (e) {
      set({ loading: false, error: e?.response?.data?.error?.message ?? e?.message });
      throw e;
    }
  },

  superlikeVideo: async (videoId) => {
    set({ loading: true, error: null });
    try {
      const data = await superlikeApi.superlikeVideo(videoId);
      set({ balance: data?.balance ?? get().balance, loading: false });
      return data;
    } catch (e) {
      set({ loading: false, error: e?.response?.data?.error?.message ?? e?.message });
      throw e;
    }
  },

  superlikeStream: async (streamId) => {
    set({ loading: true, error: null });
    try {
      const data = await superlikeApi.superlikeStream(streamId);
      set({ balance: data?.balance ?? get().balance, loading: false });
      return data;
    } catch (e) {
      set({ loading: false, error: e?.response?.data?.error?.message ?? e?.message });
      throw e;
    }
  },
}));
