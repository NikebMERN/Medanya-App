import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { disconnectSocket } from "../realtime/socket";

const TOKEN_KEY = "medanya_jwt";
const USER_KEY = "medanya_user";

const persistToken = async (token) => {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
};

const persistUser = async (user) => {
  if (user) await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  else await SecureStore.deleteItemAsync(USER_KEY);
};

export const useAuthStore = create((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  setAuth: (token, user) => {
    persistToken(token);
    persistUser(user);
    set({ token, user, isAuthenticated: !!token });
  },

  logout: async () => {
    disconnectSocket();
    await persistToken(null);
    await persistUser(null);
    set({ token: null, user: null, isAuthenticated: false });
  },

  rehydrate: async () => {
    try {
      const [token, userJson] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);
      let user = null;
      if (userJson) {
        try {
          user = JSON.parse(userJson);
        } catch (_) {}
      }
      set({ token, user, isAuthenticated: !!token });
    } catch (_) {
      set({ token: null, user: null, isAuthenticated: false });
    }
  },
}));
