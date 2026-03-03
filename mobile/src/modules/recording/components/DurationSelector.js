import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useThemeColors } from "../../../theme/useThemeColors";
import { spacing } from "../../../theme/spacing";
import { DURATION_MODES } from "../store/recording.store.js";

export default function DurationSelector({ selectedId, onSelect }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.row}>
      {DURATION_MODES.map((d) => {
        const isSelected = selectedId === d.id;
        return (
          <TouchableOpacity
            key={d.id}
            style={[styles.chip, isSelected && styles.chipActive]}
            onPress={() => onSelect(d.id)}
          >
            <Text style={[styles.chipText, isSelected && { color: colors.primary }]}>
              {d.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.15)",
    },
    chipActive: {
      backgroundColor: "rgba(255,255,255,0.35)",
    },
    chipText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
  });
}
