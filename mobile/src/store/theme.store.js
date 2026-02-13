import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const THEME_KEY = "medanya_theme";

export const useThemeStore = create((set, get) => ({
  theme: "light",

  setTheme: async (theme) => {
    const next = theme === "light" ? "light" : "dark";
    try {
      await SecureStore.setItemAsync(THEME_KEY, next);
    } catch (_) {}
    set({ theme: next });
  },

  rehydrate: async () => {
    try {
      const stored = await SecureStore.getItemAsync(THEME_KEY);
      if (stored === "light" || stored === "dark") set({ theme: stored });
      // else keep default "light" for first-time open
    } catch (_) {}
  },
}));
