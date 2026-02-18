import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { radii } from "../../theme/designSystem";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";

export default function Chip({ label, selected, onPress, style, textStyle }) {
  const colors = useThemeColors();
  const isSelected = !!selected;
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        { backgroundColor: isSelected ? colors.primary + "30" : colors.surface, borderColor: isSelected ? colors.primary : colors.border },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, { color: isSelected ? colors.primary : colors.textSecondary }, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  text: { fontSize: 14, fontWeight: "600" },
});
