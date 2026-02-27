/**
 * Trust badge: High / Normal / Caution based on trust score
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { spacing } from "../theme/spacing";

function getTrustLevel(score) {
  const s = score != null ? Number(score) : 50;
  if (s >= 70) return { label: "High Trust", icon: "verified-user", bg: "rgba(34,197,94,0.2)", color: "#22c55e" };
  if (s >= 40) return { label: "Normal", icon: "person", bg: "rgba(59,130,246,0.2)", color: "#3b82f6" };
  return { label: "Caution", icon: "warning", bg: "rgba(245,158,11,0.2)", color: "#f59e0b" };
}

export default function TrustBadge({ trustScore }) {
  const colors = useThemeColors();
  const level = getTrustLevel(trustScore);
  return (
    <View style={[styles.badge, { backgroundColor: level.bg }]}>
      <MaterialIcons name={level.icon} size={14} color={level.color} />
      <Text style={[styles.text, { color: level.color }]}>{level.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  text: { fontSize: 12, fontWeight: "600" },
});
