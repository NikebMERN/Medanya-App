/**
 * ALERT / REPORT CARD — Safety warning style.
 * Dark card with colored left accent stripe. DANGEROUS=red, WARNING=yellow
 */
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { spacing } from "../../theme/spacing";
import { useThemeColors } from "../../theme/useThemeColors";

export default function AlertCard({ data, onPress }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const riskLevel = data?.preview?.riskLevel ?? "warning";
  const isDangerous = riskLevel === "dangerous";
  const accentColor = isDangerous ? (colors.error || "#e53935") : (colors.warning || "#f59e0b");
  const badgeText = isDangerous ? "DANGEROUS" : "WARNING";

  return (
    <TouchableOpacity onPress={() => onPress?.()} activeOpacity={0.9}>
      <View style={[styles.card, { borderLeftColor: accentColor }]}>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>{data?.title ?? "Safety Alert"}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{data?.summary ?? data?.preview?.phoneMasked ?? ""}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: accentColor + "30" }]}>
          <Text style={[styles.badgeText, { color: accentColor }]}>{badgeText}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>View details</Text>
        {data?.preview?.totalReports != null && (
          <Text style={styles.reportCount}>{data.preview.totalReports} reports</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderLeftWidth: 4,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    body: { flex: 1, padding: spacing.md, minWidth: 0 },
    title: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 2 },
    subtitle: { fontSize: 13, color: colors.textSecondary },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: spacing.sm },
    badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
    footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
    footerText: { fontSize: 12, color: colors.primary, fontWeight: "600" },
    reportCount: { fontSize: 12, color: colors.textMuted },
  });
}
