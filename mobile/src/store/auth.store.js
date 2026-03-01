import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { disconnectSocket } from "../realtime/socket";

const TOKEN_KEY = "medanya_jwt";
const USER_KEY = "medanya_user";
const SECURE_STORE_MAX = 2048;

const SLIM_USER_KEYS = [
  "id", "userId", "phone_number", "display_name", "avatar_url", "avatarUrl",
  "role", "is_verified", "otp_verified", "otpVerified", "kyc_status", "kycStatus",
  "kyc_face_verified", "kycFaceVerified", "kyc_level", "kycLevel",
  "account_private", "accountPrivate", "dob", "date_of_birth", "dateOfBirth", "isGuest",
];

const slimUser = (user) => {
  if (!user || typeof user !== "object") return null;
  const out = {};
  for (const k of SLIM_USER_KEYS) {
    if (user[k] !== undefined) out[k] = user[k];
  }
  return out;
};

const persistToken = async (token) => {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
};

const persistUser = async (user) => {
  if (!user) {
    await SecureStore.deleteItemAsync(USER_KEY);
    return;
  }
  const slim = slimUser(user);
  const json = JSON.stringify(slim);
  if (json.length > SECURE_STORE_MAX) {
    const minimal = {
      id: user.id ?? user.userId,
      userId: user.userId ?? user.id,
      role: user.role,
      otp_verified: user.otp_verified ?? user.otpVerified,
      kyc_face_verified: user.kyc_face_verified ?? user.kycFaceVerified,
      display_name: ((user.display_name ?? user.displayName) || "").slice(0, 50),
    };
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(minimal));
  } else {
    await SecureStore.setItemAsync(USER_KEY, json);
  }
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

  updateUser: (updates) => {
    const { user } = get();
    if (!user) return;
    const next = { ...user, ...updates };
    persistUser(next);
    set({ user: next });
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
