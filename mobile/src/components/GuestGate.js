import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { spacing } from "../theme/spacing";
import { useAuthStore } from "../store/auth.store";

/**
 * Shown when a guest user tries to access a restricted tab.
 * Prompts them to sign in.
 */
export default function GuestGate({ message = "Sign in to access this feature" }) {
  const colors = useThemeColors();
  const logout = useAuthStore((s) => s.logout);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleSignIn = () => {
    logout();
  };

  return (
    <View style={styles.container}>
      <MaterialIcons name="lock-outline" size={64} color={colors.textMuted} style={styles.icon} />
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.subtext}>Create an account or sign in to get full access</Text>
      <TouchableOpacity style={styles.btn} onPress={handleSignIn} activeOpacity={0.8}>
        <Text style={styles.btnText}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.xl,
    },
    icon: { marginBottom: spacing.lg },
    message: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      marginBottom: spacing.sm,
    },
    subtext: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      marginBottom: spacing.xl,
    },
    btn: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl * 2,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    btnText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.white,
    },
  });
}
