/**
 * Status chip for listings/jobs: ACTIVE=green, PENDING_REVIEW=amber, HIDDEN=red
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColors } from "../theme/useThemeColors";
import { spacing } from "../theme/spacing";

const STATUS_CONFIG = {
  active: { label: "Active", bg: "rgba(34,197,94,0.2)", fg: "#22c55e" },
  ACTIVE: { label: "Active", bg: "rgba(34,197,94,0.2)", fg: "#22c55e" },
  pending_review: { label: "Pending Review", bg: "rgba(245,158,11,0.2)", fg: "#f59e0b" },
  PENDING_REVIEW: { label: "Pending Review", bg: "rgba(245,158,11,0.2)", fg: "#f59e0b" },
  hidden: { label: "Hidden", bg: "rgba(239,68,68,0.2)", fg: "#ef4444" },
  HIDDEN: { label: "Hidden", bg: "rgba(239,68,68,0.2)", fg: "#ef4444" },
};

export default function StatusChip({ status }) {
  const colors = useThemeColors();
  const s = String(status || "").toLowerCase();
  const key = s === "pending_review" ? "pending_review" : s === "hidden" ? "hidden" : "active";
  const config = STATUS_CONFIG[key] ?? STATUS_CONFIG.active;
  return (
    <View style={[styles.chip, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.fg }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  text: { fontSize: 12, fontWeight: "600" },
});
