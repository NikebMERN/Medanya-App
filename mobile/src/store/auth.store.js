import { create } from "zustand";
import { secureStorage } from "../utils/secureStorage";
import { disconnectSocket } from "../realtime/socket";
import { auth, firebaseReady } from "../config/firebase";
import { validateConfig } from "../config/validateConfig";
import { signInWithGoogle as googleSignIn, signInWithFacebook as facebookSignIn, ERROR_CODES } from "../services/socialAuth.service";

const TOKEN_KEY = "medanya_jwt";
const USER_KEY = "medanya_user";
const SECURE_STORE_MAX = 2048;

const SLIM_USER_KEYS = [
  "id", "userId", "phone", "phone_number", "display_name", "full_name", "avatar_url", "avatarUrl",
  "role", "is_verified", "otp_verified", "otpVerified", "kyc_status", "kycStatus",
  "kyc_face_verified", "kycFaceVerified", "kyc_level", "kycLevel",
  "account_private", "accountPrivate", "dob", "date_of_birth", "dateOfBirth", "isGuest", "email",
];

const normalizeBackendUser = (user) => {
  if (!user || typeof user !== "object") return user;
  return {
    ...user,
    phone_number: user.phone_number ?? user.phone,
  };
};

const slimUser = (user) => {
  if (!user || typeof user !== "object") return null;
  const out = {};
  for (const k of SLIM_USER_KEYS) {
    if (user[k] !== undefined) out[k] = user[k];
  }
  return out;
};

const persistToken = async (token) => {
  if (token) await secureStorage.setItemAsync(TOKEN_KEY, token);
  else await secureStorage.deleteItemAsync(TOKEN_KEY);
};

const persistUser = async (user) => {
  if (!user) {
    await secureStorage.deleteItemAsync(USER_KEY);
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
    await secureStorage.setItemAsync(USER_KEY, JSON.stringify(minimal));
  } else {
    await secureStorage.setItemAsync(USER_KEY, json);
  }
};

const getProvidersFromFlags = () => {
  const { flags } = validateConfig();
  return {
    google: flags.googleEnabled,
    facebook: flags.facebookEnabled,
    otp: true,
  };
};

export const useAuthStore = create((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  bannedRedirectToPenalties: false,
  authProvidersAvailable: getProvidersFromFlags(),

  setBannedRedirect: (v) => set({ bannedRedirectToPenalties: !!v }),

  refreshConfigFlags: () => {
    set({ authProvidersAvailable: getProvidersFromFlags() });
    return getProvidersFromFlags();
  },

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
    if (firebaseReady && auth?.currentUser) {
      try {
        await auth.signOut();
      } catch (_) {}
    }
    disconnectSocket();
    await persistToken(null);
    await persistUser(null);
    set({ token: null, user: null, isAuthenticated: false });
  },

  rehydrate: async () => {
    try {
      const [token, userJson] = await Promise.all([
        secureStorage.getItemAsync(TOKEN_KEY),
        secureStorage.getItemAsync(USER_KEY),
      ]);
      let user = null;
      if (userJson) {
        try {
          user = JSON.parse(userJson);
        } catch (_) {}
      }
      set({
        token,
        user,
        isAuthenticated: !!token,
        authProvidersAvailable: getProvidersFromFlags(),
      });
    } catch (_) {
      set({ token: null, user: null, isAuthenticated: false });
    }
  },

  loginWithGoogle: async (idToken, { onToast } = {}) => {
    const providers = get().authProvidersAvailable;
    if (!providers?.google) {
      const msg = "Google sign-in is not configured. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to .env";
      if (onToast) onToast(msg);
      return { ok: false, errorCode: ERROR_CODES.GOOGLE_AUTH_NOT_CONFIGURED };
    }
    try {
      const result = await googleSignIn(idToken);
      if (result.cancelled) return { ok: false, cancelled: true };
      if (!result.ok || !result.firebaseIdToken) {
        if (onToast) onToast(result.message || "Google sign-in failed.");
        return result;
      }
      const { loginWithFirebaseToken } = await import("../api/auth.api");
      const res = await loginWithFirebaseToken(result.firebaseIdToken);
      if (res?.token && res?.user) {
        get().setAuth(res.token, normalizeBackendUser(res.user));
        return { ok: true };
      }
      const backendMsg = res?.message || "Login failed. Please try again.";
      if (onToast) onToast(backendMsg);
      return { ok: false };
    } catch (e) {
      if (e?.message === ERROR_CODES.GOOGLE_AUTH_NOT_CONFIGURED) {
        if (onToast) onToast("Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to .env");
        return { ok: false, errorCode: ERROR_CODES.GOOGLE_AUTH_NOT_CONFIGURED };
      }
      const msg = e?.response?.data?.message || e?.message || "Google sign-in failed.";
      if (onToast) onToast(msg);
      return { ok: false, errorCode: "AUTH_FAILED", message: msg };
    }
  },

  loginWithFacebook: async (accessToken, { onToast } = {}) => {
    const providers = get().authProvidersAvailable;
    if (!providers?.facebook) {
      const msg = "Facebook sign-in is not configured. Add EXPO_PUBLIC_FACEBOOK_APP_ID to .env";
      if (onToast) onToast(msg);
      return { ok: false, errorCode: ERROR_CODES.FACEBOOK_AUTH_NOT_CONFIGURED };
    }
    try {
      const result = await facebookSignIn(accessToken);
      if (result.cancelled) return { ok: false, cancelled: true };
      if (!result.ok || !result.firebaseIdToken) {
        if (onToast) onToast(result.message || "Facebook sign-in failed.");
        return result;
      }
      const { loginWithFirebaseToken } = await import("../api/auth.api");
      const res = await loginWithFirebaseToken(result.firebaseIdToken);
      if (res?.token && res?.user) {
        get().setAuth(res.token, normalizeBackendUser(res.user));
        return { ok: true };
      }
      const backendMsg = res?.message || "Login failed. Please try again.";
      if (onToast) onToast(backendMsg);
      return { ok: false };
    } catch (e) {
      if (e?.message === ERROR_CODES.FACEBOOK_AUTH_NOT_CONFIGURED) {
        if (onToast) onToast("Add EXPO_PUBLIC_FACEBOOK_APP_ID to .env");
        return { ok: false, errorCode: ERROR_CODES.FACEBOOK_AUTH_NOT_CONFIGURED };
      }
      const msg = e?.response?.data?.message || e?.message || "Facebook sign-in failed.";
      if (onToast) onToast(msg);
      return { ok: false, errorCode: "AUTH_FAILED", message: msg };
    }
  },
}));
