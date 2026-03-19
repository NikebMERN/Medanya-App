/**
 * ALERT / REPORT CARD — Safety warning style (hsd design).
 * Header (author, time), red DANGEROUS pill with warning icon, main text, engagement bar.
 */
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { spacing } from "../../theme/spacing";
import { useThemeColors } from "../../theme/useThemeColors";
import FeedCardShell from "./FeedCardShell";

export default function AlertCard({ data, onPress }) {
  const colors = useThemeColors();
  const riskLevel = data?.preview?.riskLevel ?? "warning";
  const isDangerous = riskLevel === "dangerous";
  const accentColor = isDangerous ? (colors.error || "#e53935") : (colors.warning || "#f59e0b");
  const badgeText = isDangerous ? "DANGEROUS" : "WARNING";

  return (
    <TouchableOpacity onPress={() => onPress?.()} activeOpacity={0.95}>
      <FeedCardShell authorName="Safety Team" createdAt={data?.createdAt}>
        <View style={[styles.badge, { backgroundColor: accentColor }]}>
          <MaterialIcons name="warning" size={14} color="#fff" style={styles.badgeIcon} />
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
        <Text style={[styles.bodyText, { color: colors.text }]} numberOfLines={4}>
          {data?.title ?? "Safety Alert"}
          {data?.summary ? ` — ${data.summary}` : ""}
        </Text>
      </FeedCardShell>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: spacing.sm,
  },
  badgeIcon: { marginRight: 6 },
  badgeText: { fontSize: 11, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
  bodyText: { fontSize: 15, lineHeight: 22, fontWeight: "500" },
});
