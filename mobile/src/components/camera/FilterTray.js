/**
 * FilterTray — Horizontal list of filters for video recording.
 * Placeholder for VisionCamera frame processor pipeline (color matrix / blur).
 * Ready to plug DeepAR/Banuba when needed.
 */
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";

const FILTERS = [
  { id: "none", label: "None", icon: "remove" },
  { id: "vivid", label: "Vivid", icon: "color-lens" },
  { id: "warm", label: "Warm", icon: "wb-sunny" },
  { id: "cool", label: "Cool", icon: "ac-unit" },
  { id: "blur", label: "Blur", icon: "blur-on" },
  { id: "grayscale", label: "Mono", icon: "filter-b-and-w" },
];

export default function FilterTray({ selectedFilterId, onSelectFilter }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {FILTERS.map((f) => {
          const isSelected = selectedFilterId === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
              onPress={() => onSelectFilter?.(f.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.filterIconWrap, isSelected && styles.filterIconWrapActive]}>
                <MaterialIcons
                  name={f.icon}
                  size={24}
                  color={isSelected ? colors.primary : colors.textMuted}
                />
              </View>
              <Text style={[styles.filterLabel, isSelected && styles.filterLabelActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { paddingVertical: spacing.sm },
    scrollContent: { paddingHorizontal: spacing.md, gap: spacing.md },
    filterChip: {
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 12,
      backgroundColor: "rgba(0,0,0,0.3)",
      borderWidth: 2,
      borderColor: "transparent",
    },
    filterChipActive: { borderColor: colors.primary, backgroundColor: "rgba(46,107,255,0.2)" },
    filterIconWrap: { marginBottom: 4 },
    filterIconWrapActive: {},
    filterLabel: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
    filterLabelActive: { color: colors.primary },
  });
}
