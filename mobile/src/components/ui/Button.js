import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { borderRadius } from "../../theme/spacing";

export default function Button({
  title,
  onPress,
  loading,
  variant = "primary",
  style,
  textStyle,
}) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const isPrimary = variant === "primary";
  return (
    <TouchableOpacity
      style={[styles.btn, isPrimary ? styles.primary : styles.secondary, style]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.white : colors.primary} />
      ) : (
        <Text style={[styles.text, isPrimary ? styles.textPrimary : styles.textSecondary, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    btn: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.md,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 52,
    },
    primary: { backgroundColor: colors.primary },
    secondary: {
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    text: { fontSize: 15, fontWeight: "700", letterSpacing: 0.5 },
    textPrimary: { color: colors.white },
    textSecondary: { color: colors.text },
  });
}
