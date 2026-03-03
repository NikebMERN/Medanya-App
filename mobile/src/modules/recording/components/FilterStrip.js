/**
 * FilterStrip — Horizontal scrollable filter cards (left to right).
 * Inline on recording screen, above the record button.
 */
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../../theme/useThemeColors";
import { spacing } from "../../../theme/spacing";
import { useRecordingStore } from "../store/recording.store";
import { setLut } from "../../effects/effects.engine";

const ALL_FILTERS = [
  { id: "none", label: "None" },
  { id: "vivid", label: "Vivid" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
  { id: "portrait", label: "Portrait" },
  { id: "smooth", label: "Smooth" },
  { id: "natural", label: "Natural" },
  { id: "film", label: "Film" },
  { id: "noir", label: "Noir" },
  { id: "dramatic", label: "Dramatic" },
];

export default function FilterStrip() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const activeFilterId = useRecordingStore((s) => s.activeFilterId);
  const setFilter = useRecordingStore((s) => s.setFilter);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scroll}
    >
      {ALL_FILTERS.map((f) => {
        const isActive = activeFilterId === f.id;
        return (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterCard, isActive && styles.filterCardActive]}
            onPress={() => {
              setFilter(f.id);
              setLut(f.id);
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.filterThumb, isActive && styles.filterThumbActive]}>
              <MaterialIcons
                name="filter"
                size={24}
                color={isActive ? colors.primary : "rgba(255,255,255,0.9)"}
              />
            </View>
            <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]} numberOfLines={1}>
              {f.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    scroll: {
      maxHeight: 90,
    },
    scrollContent: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
    },
    filterCard: {
      alignItems: "center",
      width: 56,
      marginRight: spacing.md,
    },
    filterCardActive: {
      opacity: 1,
    },
    filterThumb: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "rgba(255,255,255,0.2)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 4,
    },
    filterThumbActive: {
      backgroundColor: "rgba(255,255,255,0.35)",
      borderWidth: 2,
      borderColor: colors.primary || "#3b82f6",
    },
    filterLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: "rgba(255,255,255,0.9)",
    },
    filterLabelActive: {
      color: colors.primary || "#fff",
    },
  });
}
