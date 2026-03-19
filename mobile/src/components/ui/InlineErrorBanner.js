/**
 * InlineErrorBanner — User-friendly error display (no Alert).
 * Dismissible banner with icon, message, and retry action.
 */
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";

export default function InlineErrorBanner({ message, onRetry, onDismiss }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={[styles.banner, { backgroundColor: colors.error + "18", borderColor: colors.error + "40" }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.error + "30" }]}>
        <MaterialIcons name="error-outline" size={22} color={colors.error} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]}>Something went wrong</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
          {message || "Please try again."}
        </Text>
        <View style={styles.actions}>
          {onRetry && (
            <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={onRetry}>
              <MaterialIcons name="refresh" size={18} color="#fff" />
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          )}
          {onDismiss && (
            <TouchableOpacity style={[styles.dismissBtn, { borderColor: colors.border }]} onPress={onDismiss}>
              <Text style={[styles.dismissText, { color: colors.textMuted }]}>Dismiss</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {onDismiss && (
        <TouchableOpacity style={styles.closeIcon} onPress={onDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <MaterialIcons name="close" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    banner: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginHorizontal: spacing.md,
      marginVertical: spacing.sm,
      padding: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
    },
    iconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginRight: spacing.sm },
    body: { flex: 1, minWidth: 0 },
    title: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
    message: { fontSize: 14, lineHeight: 20 },
    actions: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
    retryBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: 10 },
    retryText: { fontSize: 14, fontWeight: "600", color: "#fff" },
    dismissBtn: { paddingVertical: 8, paddingHorizontal: spacing.sm, borderRadius: 10, borderWidth: 1 },
    dismissText: { fontSize: 14, fontWeight: "600" },
    closeIcon: { padding: 4 },
  });
}
