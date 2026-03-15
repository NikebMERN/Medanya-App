/**
 * Platform-aware secure storage.
 * - Native: expo-secure-store (encrypted)
 * - Web: localStorage (no native secure storage in browsers)
 */
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const isWeb = Platform.OS === "web";

const webStorage = {
  async getItemAsync(key) {
    if (typeof localStorage === "undefined") return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItemAsync(key, value) {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(key, value);
    } catch (_) {}
  },
  async deleteItemAsync(key) {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.removeItem(key);
    } catch (_) {}
  },
};

export const secureStorage = isWeb ? webStorage : SecureStore;
