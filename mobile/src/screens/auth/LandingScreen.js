import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
} from "react-native";

const isWeb = Platform.OS === "web";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import * as WebBrowser from "expo-web-browser";

import Logo from "../../components/ui/Logo";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import { useThemeStore } from "../../store/theme.store";
import { getAppRedirectUri, isExpoGo } from "../../services/firebaseAuth";
import { getGoogleIdTokenNative } from "../../services/nativeGoogleSignIn";
import { useAuthRequest as useGoogleAuthRequest } from "expo-auth-session/providers/google";
import { useAuthRequest as useFacebookAuthRequest } from "expo-auth-session/providers/facebook";
import { validateConfig } from "../../config/validateConfig";
import { authConfig } from "../../config/authConfig";

// ✅ CRITICAL: completes auth sessions correctly (fixes "missing initial state")
WebBrowser.maybeCompleteAuthSession();

export default function LandingScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();

  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setAuth = useAuthStore((s) => s.setAuth);
  const authProvidersAvailable = useAuthStore((s) => s.authProvidersAvailable);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const loginWithGoogleWebPopup = useAuthStore((s) => s.loginWithGoogleWebPopup);
  const loginWithFacebook = useAuthStore((s) => s.loginWithFacebook);
  const loginWithFacebookWebPopup = useAuthStore((s) => s.loginWithFacebookWebPopup);
  const refreshConfigFlags = useAuthStore((s) => s.refreshConfigFlags);

  const { flags, missing } = useMemo(() => validateConfig(), []);
  const googleEnabled =
    authProvidersAvailable?.google ?? flags?.googleEnabled ?? false;
  const facebookEnabled =
    authProvidersAvailable?.facebook ?? flags?.facebookEnabled ?? false;

  const styles = useMemo(() => createStyles(colors), [colors]);

  const googleWebClientId = authConfig.google.webClientId || "";

  useEffect(() => {
    refreshConfigFlags();
  }, [refreshConfigFlags]);

  const onToast = useCallback((msg) => setError(msg || ""), []);

  const redirectUri = useMemo(() => getAppRedirectUri(), []);
  if (__DEV__) console.log("[Auth] OAuth redirectUri:", redirectUri);
  const facebookClientIdForAuth = authConfig.facebook.appId || "0";

  // Expo Go / Expo runtime: use expo-auth-session OAuth flows (works without native modules).
  // Client IDs differ between Expo Go (proxy/web redirect) and installed builds (native redirect).

  const effectiveGoogleClientId = isExpoGo
    ? googleWebClientId
    : Platform.OS === "android"
      ? authConfig.google.androidClientId || googleWebClientId
      : Platform.OS === "ios"
        ? authConfig.google.iosClientId || googleWebClientId
        : googleWebClientId;

  const [googleAuthRequest, , promptGoogleAuth] = useGoogleAuthRequest({
    clientId: effectiveGoogleClientId,
    redirectUri,
    scopes: ["openid", "email", "profile"],
  });
  const [facebookAuthRequest, , promptFacebookAuth] = useFacebookAuthRequest({
    clientId: facebookClientIdForAuth,
    redirectUri,
    scopes: ["public_profile", "email"],
  });

  const handleGoogleLogin = async () => {
    setError("");
    if (!googleEnabled) {
      const keys = missing?.google || ["EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"];
      Alert.alert(
        "Setup required",
        `Missing: ${keys.join(", ")}\n\nAdd these to your .env file and restart the app.`
      );
      return;
    }

    const isWebPlatform = Platform.OS === "web";
    if (isWebPlatform) {
      try {
        setLoading(true);
        const res = await loginWithGoogleWebPopup({ onToast });
        if (res?.ok || res?.cancelled) return;
      } catch (e) {
        if (__DEV__) setError(e?.message || "Google sign-in failed.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!effectiveGoogleClientId || effectiveGoogleClientId === "0") {
      setError("Google sign-in is not configured. Missing Google client id in .env.");
      return;
    }

    try {
      setLoading(true);

      // Dev / production builds: @react-native-google-signin + idToken → Firebase (same as google-tutorial).
      // Expo Go: native module unavailable → expo-auth-session below.
      if (!isExpoGo && googleWebClientId) {
        const nativeRes = await getGoogleIdTokenNative(googleWebClientId);
        if (nativeRes?.idToken) {
          const loginRes = await loginWithGoogle(nativeRes.idToken, { onToast });
          if (loginRes?.cancelled) setError("");
          return;
        }
        if (nativeRes?.cancelled) return;
      }

      if (!promptGoogleAuth || !googleAuthRequest) {
        setError("Google sign-in is not ready yet. Try again in a moment.");
        return;
      }

      const result = await promptGoogleAuth();
      if (__DEV__) console.log("[Auth][Google] oauth result:", result);
      if (result?.type === "success") {
        const idToken =
          result?.params?.id_token ||
          result?.params?.idToken ||
          result?.authentication?.idToken ||
          result?.authentication?.id_token;
        if (idToken) {
          const loginRes = await loginWithGoogle(idToken, { onToast });
          if (loginRes?.cancelled) setError("");
          return;
        }
        const msg = result?.params?.error_description || result?.params?.error || "Google sign-in failed.";
        setError(String(msg));
        return;
      }

      if (result?.type === "dismiss" || result?.type === "cancel" || result?.type === "cancelled") return;
      setError("Google sign-in failed. Please try again.");
    } catch (e) {
      if (__DEV__) setError(e?.message || "Google sign-in failed.");
      else setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setError("");
    if (!facebookEnabled) {
      const keys = missing?.facebook || ["EXPO_PUBLIC_FACEBOOK_APP_ID"];
      Alert.alert(
        "Setup required",
        `Missing: ${keys.join(", ")}\n\nAdd these to your .env file and restart the app.`
      );
      return;
    }

    const isWebPlatform = Platform.OS === "web";
    if (isWebPlatform) {
      try {
        setLoading(true);
        const res = await loginWithFacebookWebPopup({ onToast });
        if (res?.ok || res?.cancelled) return;
      } catch (e) {
        if (__DEV__) setError(e?.message || "Facebook sign-in failed.");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      if (!promptFacebookAuth || !facebookAuthRequest) {
        setError("Facebook sign-in is not ready yet. Try again in a moment.");
        return;
      }

      const result = await promptFacebookAuth();
      if (__DEV__) console.log("[Auth][Facebook] oauth result:", result);
      if (result?.type === "success") {
        const accessToken =
          result?.params?.access_token ||
          result?.params?.accessToken ||
          result?.params?.token ||
          result?.authentication?.accessToken ||
          result?.authentication?.access_token;
        if (accessToken) {
          const loginRes = await loginWithFacebook(accessToken, { onToast });
          if (loginRes?.cancelled) setError("");
          return;
        }
        const msg = result?.params?.error_description || result?.params?.error || "Facebook sign-in failed.";
        setError(String(msg));
        return;
      }

      if (result?.type === "dismiss" || result?.type === "cancel" || result?.type === "cancelled") return;
      setError("Facebook sign-in failed. Please try again.");
    } catch (e) {
      if (__DEV__) setError(e?.message || "Facebook sign-in failed.");
      else setError("Facebook sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const { loginAsGuest } = await import("../../api/auth.api");
      const res = await loginAsGuest();
      if (res.token && res.user) {
        setAuth(res.token, res.user);
      } else {
        setError("Guest sign-in failed. Please try again.");
      }
    } catch (e) {
      const apiMsg = e?.response?.data?.message;
      const netMsg = e?.message;
      if (apiMsg) {
        setError(apiMsg);
      } else if (typeof netMsg === "string" && netMsg.toLowerCase().includes("network")) {
        setError("Could not reach the server. Check EXPO_PUBLIC_API_URL and that your backend is running.");
      } else if (typeof netMsg === "string" && netMsg.toLowerCase().includes("timeout")) {
        setError("Server timeout. Check your backend URL and network connection.");
      } else {
        setError("Could not continue as guest.");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
          <Text style={styles.themeToggleText}>
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </Text>
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.content}>
            <Logo />

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate("Phone")}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryBtnIcon}>📱</Text>
              <Text style={styles.primaryBtnText}>GET STARTED WITH PHONE</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CONNECT VIA</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[
                  styles.socialBtn,
                  styles.googleBtn,
                  !googleEnabled && styles.socialBtnDisabled,
                ]}
                onPress={handleGoogleLogin}
                disabled={loading || !googleEnabled}
                activeOpacity={0.8}
              >
                <Text style={[styles.socialIcon, !googleEnabled && styles.socialLabelDisabled]}>
                  G
                </Text>
                <Text style={[styles.socialLabel, !googleEnabled && styles.socialLabelDisabled]}>
                  {googleEnabled ? "GOOGLE" : "Google Sign-in (Setup required)"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.socialBtn,
                  styles.facebookBtn,
                  !facebookEnabled && styles.socialBtnDisabled,
                ]}
                onPress={handleFacebookLogin}
                disabled={loading || !facebookEnabled}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.socialIcon,
                    styles.facebookIcon,
                    !facebookEnabled && styles.socialLabelDisabled,
                  ]}
                >
                  f
                </Text>
                <Text
                  style={[
                    styles.socialLabel,
                    styles.facebookLabel,
                    !facebookEnabled && styles.socialLabelDisabled,
                  ]}
                >
                  {facebookEnabled ? "FACEBOOK" : "Facebook Sign-in (Setup required)"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.guestBtn}
              onPress={handleGuestLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.guestBtnText}>Continue as guest</Text>
              <Text style={styles.guestBtnSubtext}>Watch videos without signing in</Text>
            </TouchableOpacity>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By joining, you agree to our Community Terms and Safety Guidelines.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
    },
    themeToggle: {
      position: "absolute",
      right: spacing.md,
      top: 56,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      zIndex: 1,
    },
    themeToggleText: { fontSize: 14, color: colors.text, fontWeight: "600" },
    content: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xxl * 1.5,
      paddingBottom: spacing.xl,
    },
    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: 20,
      paddingVertical: spacing.lg,
      marginBottom: spacing.lg,
      ...(isWeb ? { boxShadow: "0 4px 8px rgba(0,0,0,0.2)" } : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
      }),
    },
    primaryBtnIcon: { fontSize: 22 },
    primaryBtnText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.lg,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.5,
      marginHorizontal: spacing.sm,
    },
    socialRow: {
      flexDirection: "row",
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    socialBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      ...(isWeb ? { boxShadow: "0 2px 6px rgba(0,0,0,0.1)" } : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 2,
      }),
    },
    googleBtn: { backgroundColor: colors.surface },
    facebookBtn: { backgroundColor: "#1877f2", borderColor: "#1877f2" },
    socialBtnDisabled: {
      backgroundColor: colors.border,
      borderColor: colors.border,
      opacity: 0.8,
    },
    socialLabelDisabled: { color: colors.textMuted },
    socialIcon: { fontSize: 18, fontWeight: "700", color: colors.text },
    socialLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      letterSpacing: 0.5,
    },
    facebookLabel: { color: colors.white },
    facebookIcon: { color: colors.white },
    guestBtn: {
      marginTop: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: "center",
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    guestBtnText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textSecondary,
      letterSpacing: 0.3,
    },
    guestBtnSubtext: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    error: { color: colors.error, fontSize: 13, marginBottom: spacing.sm },
    footer: { marginTop: "auto", paddingTop: spacing.xl },
    footerText: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
  });
}