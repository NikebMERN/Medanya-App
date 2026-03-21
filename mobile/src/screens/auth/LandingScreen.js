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

import Logo from "../../components/ui/Logo";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import { useThemeStore } from "../../store/theme.store";
import { validateConfig } from "../../config/validateConfig";
import { authConfig } from "../../config/authConfig";
import { getGoogleIdTokenNative } from "../../services/nativeGoogleSignIn";
import { getFacebookAccessTokenNative } from "../../services/nativeFacebookSignIn";

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

    if (isWeb) {
      try {
        setLoading(true);
        const res = await loginWithGoogleWebPopup({ onToast });
        if (res?.ok || res?.cancelled) return;
        setError(res?.message || "Google sign-in failed.");
      } catch (e) {
        setError(e?.message || "Google sign-in failed.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!googleWebClientId || googleWebClientId === "0") {
      setError("Google sign-in is not configured. Missing Google web client ID in .env.");
      return;
    }

    try {
      setLoading(true);
      const nativeRes = await getGoogleIdTokenNative({
        webClientId: googleWebClientId,
        iosClientId: authConfig.google.iosClientId || undefined,
      });
      if (nativeRes?.unavailable) {
        setError("Google sign-in is not available. Use a development or production build (not Expo Go).");
        return;
      }
      if (nativeRes?.cancelled) return;
      if (nativeRes?.idToken) {
        const loginRes = await loginWithGoogle(nativeRes.idToken, { onToast });
        if (loginRes?.cancelled) setError("");
        else if (!loginRes?.ok && loginRes?.message) setError(loginRes.message);
        return;
      }
      setError("Google sign-in did not return a token. Please try again.");
    } catch (e) {
      setError(e?.message || "Google sign-in failed. Please try again.");
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

    if (isWeb) {
      try {
        setLoading(true);
        const res = await loginWithFacebookWebPopup({ onToast });
        if (res?.ok || res?.cancelled) return;
        setError(res?.message || "Facebook sign-in failed.");
      } catch (e) {
        setError(e?.message || "Facebook sign-in failed.");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      const nativeRes = await getFacebookAccessTokenNative();
      if (nativeRes?.unavailable) {
        setError("Facebook sign-in is not available. Use a development or production build (not Expo Go).");
        return;
      }
      if (nativeRes?.cancelled) return;
      if (nativeRes?.accessToken) {
        const loginRes = await loginWithFacebook(nativeRes.accessToken, { onToast });
        if (loginRes?.cancelled) setError("");
        else if (!loginRes?.ok && loginRes?.message) setError(loginRes.message);
        return;
      }
      setError("Facebook sign-in did not return a token. Please try again.");
    } catch (e) {
      setError(e?.message || "Facebook sign-in failed. Please try again.");
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
      const status = e?.response?.status;
      if (apiMsg) {
        setError(apiMsg);
      } else if (status === 401) {
        setError("Session expired. Please try again.");
      } else if (typeof netMsg === "string" && netMsg.toLowerCase().includes("network")) {
        setError("Could not reach the server. Check your connection and try again.");
      } else if (typeof netMsg === "string" && netMsg.toLowerCase().includes("timeout")) {
        setError("Request timed out. Please try again.");
      } else {
        setError("Could not continue as guest. Please try again.");
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
