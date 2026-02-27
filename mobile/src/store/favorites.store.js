/**
 * Marketplace favorites: persisted set of item IDs + optional snippet for list UI.
 */
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FAVORITES_KEY = "@medanya_marketplace_favorites";
const FAVORITES_SNIPPETS_KEY = "@medanya_marketplace_favorites_snippets";

const loadFavorites = async () => {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    const rawSnip = await AsyncStorage.getItem(FAVORITES_SNIPPETS_KEY);
    const snippets = rawSnip ? JSON.parse(rawSnip) : {};
    return { ids: Array.isArray(ids) ? ids : [], snippets: snippets && typeof snippets === "object" ? snippets : {} };
  } catch {
    return { ids: [], snippets: {} };
  }
};

const saveFavorites = async (ids, snippets) => {
  try {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
    await AsyncStorage.setItem(FAVORITES_SNIPPETS_KEY, JSON.stringify(snippets || {}));
  } catch (_) {}
};

export const useFavoritesStore = create((set, get) => ({
  favoriteIds: [],
  snippets: {},
  hydrated: false,

  hydrate: async () => {
    const { ids, snippets } = await loadFavorites();
    set({ favoriteIds: ids, snippets, hydrated: true });
  },

  isFavorite: (itemId) => {
    const id = String(itemId);
    return (get().favoriteIds || []).includes(id);
  },

  toggleFavorite: (itemId, snippet) => {
    const id = String(itemId);
    set((state) => {
      const ids = state.favoriteIds || [];
      const nextIds = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      const nextSnippets = { ...(state.snippets || {}) };
      if (snippet && nextIds.includes(id)) {
        nextSnippets[id] = {
          title: snippet.title,
          price: snippet.price,
          imageUrl: snippet.imageUrl,
          location: snippet.location,
        };
      } else if (!nextIds.includes(id)) {
        delete nextSnippets[id];
      }
      saveFavorites(nextIds, nextSnippets);
      return { favoriteIds: nextIds, snippets: nextSnippets };
    });
  },

  setSnippet: (itemId, snippet) => {
    const id = String(itemId);
    set((state) => {
      const next = { ...(state.snippets || {}) };
      if (snippet) next[id] = snippet;
      else delete next[id];
      saveFavorites(state.favoriteIds || [], next);
      return { snippets: next };
    });
  },
}));
