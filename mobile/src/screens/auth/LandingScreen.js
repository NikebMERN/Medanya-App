import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";
import Logo from "../../components/ui/Logo";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import { useThemeStore } from "../../store/theme.store";
import {
  signInWithGoogleCredential,
  signInWithFacebookCredential,
  getAppRedirectUri,
  logExpoAuthProxyUrl,
} from "../../services/firebaseAuth";
import { env } from "../../utils/env";

export default function LandingScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const setAuth = useAuthStore((s) => s.setAuth);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const googleWebClientId = env.googleWebClientId || "";
  const googleIosClientId = env.googleIosClientId || googleWebClientId;
  const googleAndroidClientId = env.googleAndroidClientId || googleWebClientId;
  const facebookAppId = env.facebookAppId || "";
  const redirectUri = getAppRedirectUri();

  useEffect(() => {
    logExpoAuthProxyUrl();
  }, []);

  const [googleRequest, googleResponse, googlePromptAsync] =
    Google.useIdTokenAuthRequest({
      webClientId: googleWebClientId,
      iosClientId: googleIosClientId,
      androidClientId: googleAndroidClientId,
      redirectUri,
      scopes: ["openid", "profile", "email"],
    });

  const [fbRequest, fbResponse, fbPromptAsync] = Facebook.useAuthRequest({
    clientId: facebookAppId,
    scopes: ["public_profile", "email"],
    redirectUri,
  });

  const loginWithBackend = useCallback(
    async (idToken) => {
      try {
        const { loginWithFirebaseToken } = await import("../../api/auth.api");
        const res = await loginWithFirebaseToken(idToken);
        if (res.token && res.user) {
          setAuth(res.token, res.user);
        } else {
          setError("Login failed. Please try again.");
        }
      } catch (e) {
        setError("Backend communication failed.");
      }
    },
    [setAuth]
  );

  const lastGoogleSuccessRef = useRef(null);
  const lastFbSuccessRef = useRef(null);

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken =
        googleResponse.params?.id_token || googleResponse.authentication?.idToken;
      if (!idToken || lastGoogleSuccessRef.current === googleResponse) return;
      lastGoogleSuccessRef.current = googleResponse;

      setError("");
      setLoading(true);
      signInWithGoogleCredential(idToken)
        .then(({ token }) => loginWithBackend(token))
        .catch((err) => setError(err.message || "Google sign-in failed."))
        .finally(() => setLoading(false));
    } else if (googleResponse?.type === "error") {
      setError("Google Login Error: " + googleResponse.error?.message);
    }
  }, [googleResponse, loginWithBackend]);

  useEffect(() => {
    if (fbResponse?.type === "success") {
      const accessToken =
        fbResponse.authentication?.accessToken || fbResponse.params?.access_token;
      if (!accessToken || lastFbSuccessRef.current === fbResponse) return;
      lastFbSuccessRef.current = fbResponse;

      setError("");
      setLoading(true);
      signInWithFacebookCredential(accessToken)
        .then(({ token }) => loginWithBackend(token))
        .catch((err) => setError(err.message || "Facebook sign-in failed."))
        .finally(() => setLoading(false));
    }
  }, [fbResponse, loginWithBackend]);

  const handleGoogleLogin = () => {
    setError("");
    googlePromptAsync({ useProxy: false });
  };

  const handleFacebookLogin = () => {
    setError("");
    fbPromptAsync({ useProxy: false });
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
            style={[styles.socialBtn, styles.googleBtn]}
            onPress={handleGoogleLogin}
            disabled={loading || !googleRequest}
            activeOpacity={0.8}
          >
            <Text style={styles.socialIcon}>G</Text>
            <Text style={styles.socialLabel}>GOOGLE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialBtn, styles.facebookBtn]}
            onPress={handleFacebookLogin}
            disabled={loading || !fbRequest}
            activeOpacity={0.8}
          >
            <Text style={[styles.socialIcon, styles.facebookIcon]}>f</Text>
            <Text style={[styles.socialLabel, styles.facebookLabel]}>
              FACEBOOK
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
    link: { color: colors.primary, fontWeight: "600" },
  });
}
