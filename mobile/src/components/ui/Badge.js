import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColors } from "../../theme/useThemeColors";

export default function Badge({ label, variant = "default", style, textStyle }) {
  const colors = useThemeColors();
  const isDanger = variant === "danger" || variant === "error";
  const isLive = variant === "live";
  const bg = isDanger ? (colors.error || "#ef4444") : isLive ? (colors.error || "#e53935") : colors.primary + "25";
  const fg = isDanger || isLive ? colors.white : colors.primary;
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: fg }, textStyle]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  text: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
});
