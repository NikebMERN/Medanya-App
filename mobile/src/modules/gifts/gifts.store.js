import { create } from "zustand";
import * as giftsApi from "./gifts.api";

export const useGiftsStore = create((set) => ({
  giftCatalog: [],
  selectedGift: null,
  quantity: 1,
  sending: false,
  error: null,

  fetchCatalog: async () => {
    try {
      const gifts = await giftsApi.getGiftCatalog();
      set({ giftCatalog: gifts });
    } catch (e) {
      set({ giftCatalog: [], error: e?.message });
    }
  },

  setSelectedGift: (gift) => set({ selectedGift: gift }),
  setQuantity: (qty) => set({ quantity: Math.max(1, Math.min(99, qty)) }),
  setSending: (v) => set({ sending: v }),
  setError: (e) => set({ error: e }),

  sendGift: async (streamId, giftId, quantity, onSuccess) => {
    set({ sending: true, error: null });
    try {
      const data = await giftsApi.sendGift(streamId, giftId, quantity);
      set({ sending: false, selectedGift: null, quantity: 1 });
      onSuccess?.(data);
      return data;
    } catch (e) {
      set({ sending: false, error: e?.message });
      throw e;
    }
  },
}));
