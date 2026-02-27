/**
 * Empty state: "No items found" / "No jobs found" with retry
 */
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { spacing } from "../theme/spacing";

export default function EmptyState({ variant = "items", onRetry }) {
  const colors = useThemeColors();
  const isItems = variant === "items" || variant === "marketplace";
  const icon = isItems ? "storefront" : "work-off";
  const title = isItems ? "No items found" : "No jobs found";
  const subtext = isItems ? "Try different filters or add your own" : "Try different filters or search terms";

  return (
    <View style={styles.container}>
      <MaterialIcons name={icon} size={48} color={colors.textMuted} />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtext, { color: colors.textMuted }]}>{subtext}</Text>
      {onRetry ? (
        <TouchableOpacity style={[styles.retryBtn, { borderColor: colors.primary }]} onPress={onRetry}>
          <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  title: { fontSize: 16, fontWeight: "600", marginTop: spacing.md },
  subtext: { fontSize: 14, marginTop: spacing.xs },
  retryBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
  },
  retryText: { fontSize: 15, fontWeight: "600" },
});
