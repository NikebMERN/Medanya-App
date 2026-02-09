import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Logo from "../../components/ui/Logo";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import { useThemeStore } from "../../store/theme.store";
import { signInWithGoogle, signInWithFacebook } from "../../services/firebaseAuth";

export default function LandingScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const setAuth = useAuthStore((s) => s.setAuth);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleGetStartedWithPhone = () => {
    setError("");
    navigation.navigate("Phone");
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const { user, token: idToken } = await signInWithGoogle();
      const { loginWithFirebaseToken } = await import("../../api/auth.api");
      const res = await loginWithFirebaseToken(idToken);
      if (res.token && res.user) {
        setAuth(res.token, res.user);
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const { user, token: idToken } = await signInWithFacebook();
      const { loginWithFirebaseToken } = await import("../../api/auth.api");
      const res = await loginWithFirebaseToken(idToken);
      if (res.token && res.user) {
        setAuth(res.token, res.user);
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Facebook sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
        <Text style={styles.themeToggleText}>{theme === "dark" ? "☀️ Light" : "🌙 Dark"}</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        <Logo />

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleGetStartedWithPhone}
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
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.socialIcon}>G</Text>
            <Text style={styles.socialLabel}>GOOGLE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.socialBtn, styles.facebookBtn]}
            onPress={handleFacebookLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={[styles.socialIcon, styles.facebookIcon]}>f</Text>
            <Text style={[styles.socialLabel, styles.facebookLabel]}>FACEBOOK</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By joining, you agree to our{" "}
            <Text style={styles.link}>Community Terms</Text> and{" "}
            <Text style={styles.link}>Safety Guidelines</Text>.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    themeToggle: {
      position: "absolute",
      right: spacing.md,
      top: 56,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 8,
      backgroundColor: colors.surface,
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
      borderRadius: 12,
      paddingVertical: spacing.lg,
      marginBottom: spacing.lg,
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
    socialRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
    socialBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    googleBtn: { backgroundColor: colors.surface },
    facebookBtn: { backgroundColor: "#1877f2" },
    socialIcon: { fontSize: 18, fontWeight: "700", color: colors.text },
    socialLabel: { fontSize: 14, fontWeight: "600", color: colors.text, letterSpacing: 0.5 },
    facebookLabel: { color: colors.white },
    facebookIcon: { color: colors.white },
    error: { color: colors.error, fontSize: 13, marginBottom: spacing.sm },
    footer: { marginTop: "auto", paddingTop: spacing.xl },
    footerText: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
    link: { color: colors.primary, fontWeight: "600" },
  });
}
