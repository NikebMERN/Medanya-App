import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";

import Logo from "../../components/ui/Logo";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import { useThemeStore } from "../../store/theme.store";
import {
  getAppRedirectUri,
  logExpoAuthProxyUrl,
  isExpoGo,
} from "../../services/firebaseAuth";
import { validateConfig } from "../../config/validateConfig";
import { env } from "../../utils/env";

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
  const loginWithFacebook = useAuthStore((s) => s.loginWithFacebook);
  const refreshConfigFlags = useAuthStore((s) => s.refreshConfigFlags);

  const { flags, missing } = useMemo(() => validateConfig(), []);
  const googleEnabled =
    authProvidersAvailable?.google ?? flags?.googleEnabled ?? false;
  const facebookEnabled =
    authProvidersAvailable?.facebook ?? flags?.facebookEnabled ?? false;

  const styles = useMemo(() => createStyles(colors), [colors]);

  const googleWebClientId = env.googleWebClientId || "";
  const googleExpoClientId = env.googleExpoClientId || googleWebClientId;
  const googleIosClientId = env.googleIosClientId || googleWebClientId;
  const googleAndroidClientId = env.googleAndroidClientId || googleWebClientId;

  const facebookAppId = env.facebookAppId || "";
  const redirectUri = useMemo(() => getAppRedirectUri(isExpoGo), []);

  useEffect(() => {
    logExpoAuthProxyUrl();
    refreshConfigFlags();
  }, [refreshConfigFlags]);

  // Google: Expo Go uses proxy + expoClientId (or webClientId); Dev Build uses iosClientId/androidClientId
  const googleClientIdForExpoGo = googleExpoClientId || googleWebClientId;
  const [googleRequest, googleResponse, googlePromptAsync] =
    Google.useIdTokenAuthRequest(
      {
        webClientId: googleWebClientId,
        iosClientId: isExpoGo ? googleClientIdForExpoGo : (googleIosClientId || googleWebClientId),
        androidClientId: isExpoGo ? googleClientIdForExpoGo : (googleAndroidClientId || googleWebClientId),
        redirectUri,
        scopes: ["openid", "profile", "email"],
      },
      { scheme: "medanya", path: "redirect" }
    );

  // ✅ FACEBOOK: Use Auth request
  const [fbRequest, fbResponse, fbPromptAsync] = Facebook.useAuthRequest({
    clientId: facebookAppId,
    scopes: ["public_profile", "email"],
    redirectUri,
  });

  const onToast = useCallback((msg) => setError(msg || ""), []);

  const lastGoogleSuccessRef = useRef(null);
  const lastFbSuccessRef = useRef(null);

  // =========================
  // GOOGLE RESPONSE HANDLER
  // =========================
  useEffect(() => {
    if (!googleResponse) return;

    if (googleResponse.type === "success") {
      // token may live in params or authentication
      const idToken =
        googleResponse.params?.id_token ||
        googleResponse.authentication?.idToken;

      // prevent double-handling
      if (!idToken || lastGoogleSuccessRef.current === googleResponse) return;
      lastGoogleSuccessRef.current = googleResponse;

      setError("");
      setLoading(true);

      loginWithGoogle(idToken, { onToast })
        .then((res) => {
          if (res?.cancelled) setError("");
        })
        .catch(() => {
          setError("Google sign-in failed. Please try again.");
        })
        .finally(() => setLoading(false));
    }

    if (googleResponse.type === "error") {
      const msg =
        googleResponse.error?.message ||
        googleResponse.error?.code ||
        "Google sign-in failed.";
      if (String(msg).toLowerCase().includes("cancel")) {
        setError("");
      } else {
        setError("Google sign-in failed. Check your Google settings or try again.");
      }
    }
  }, [googleResponse, loginWithGoogle, onToast]);

  // =========================
  // FACEBOOK RESPONSE HANDLER
  // =========================
  useEffect(() => {
    if (!fbResponse) return;

    if (fbResponse.type === "success") {
      const accessToken =
        fbResponse.authentication?.accessToken || fbResponse.params?.access_token;

      if (!accessToken || lastFbSuccessRef.current === fbResponse) return;
      lastFbSuccessRef.current = fbResponse;

      setError("");
      setLoading(true);

      loginWithFacebook(accessToken, { onToast })
        .then((res) => {
          if (res?.cancelled) setError("");
        })
        .catch(() => {
          setError("Facebook sign-in failed. Please try again.");
        })
        .finally(() => setLoading(false));
    }

    if (fbResponse.type === "error") {
      const msg =
        fbResponse.error?.message ||
        fbResponse.error?.code ||
        "Facebook sign-in failed.";
      if (String(msg).toLowerCase().includes("cancel")) {
        setError("");
      } else {
        setError("Facebook sign-in failed. Try again.");
      }
    }
  }, [fbResponse, loginWithFacebook, onToast]);

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
    if (!googleRequest) {
      setError("Google sign-in is not ready yet. Wait a moment and try again.");
      return;
    }

    try {
      await googlePromptAsync({ useProxy: isExpoGo, showInRecents: true });
    } catch (e) {
      const msg = e?.message || "Google sign-in could not start.";
      setError(__DEV__ ? msg : "Google sign-in could not start. Try again.");
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

    try {
      await fbPromptAsync({ useProxy: isExpoGo, showInRecents: true });
    } catch (e) {
      setError("Facebook sign-in could not start. Try again.");
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
      setError(e?.response?.data?.message || "Could not continue as guest.");
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
              disabled={loading || (googleEnabled && !googleRequest)}
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
              disabled={loading}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
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
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
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
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 2,
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