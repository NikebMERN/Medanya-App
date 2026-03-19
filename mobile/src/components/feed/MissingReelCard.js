/**
 * MissingReelCard — Horizontal scroll card for missing persons (same design system as VideoReelCard).
 * Compact vertical card: photo, URGENT badge, title.
 */
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { spacing } from "../../theme/spacing";
import { useThemeColors } from "../../theme/useThemeColors";

const CARD_WIDTH = 120;
const CARD_HEIGHT = 180;

export default function MissingReelCard({ data, onPress }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const photoUrl = data?.preview?.photoUrl ?? data?.photoUrl;
  const title = data?.title ?? "Missing Person";
  const name = title.replace(/^Missing: /, "");

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.()} activeOpacity={0.9}>
      <View style={styles.thumbWrap}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <MaterialIcons name="person" size={32} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.urgentBadge}>
          <Text style={styles.urgentText}>URGENT</Text>
        </View>
      </View>
      <Text style={[styles.caption, { color: colors.text }]} numberOfLines={2}>{name || "Missing"}</Text>
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: { width: CARD_WIDTH, marginRight: spacing.sm },
    thumbWrap: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: colors.surfaceLight,
    },
    thumb: { width: "100%", height: "100%" },
    thumbPlaceholder: { justifyContent: "center", alignItems: "center" },
    urgentBadge: {
      position: "absolute",
      bottom: 6,
      left: 6,
      right: 6,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: "#7c3aed",
      alignItems: "center",
    },
    urgentText: { fontSize: 10, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
    caption: { fontSize: 12, fontWeight: "600", marginTop: 6 },
  });
}
