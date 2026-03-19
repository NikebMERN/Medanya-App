import React from "react";
import { View, StyleSheet } from "react-native";
import { radii, shadows } from "../../theme/designSystem";
import { useThemeColors } from "../../theme/useThemeColors";

/**
 * Neumorphic-style card: soft outer shadow, rounded corners, optional highlight border.
 */
export default function NeoCard({ children, style, noShadow, ...props }) {
  const colors = useThemeColors();
  const cardStyle = [
    styles.card,
    { backgroundColor: colors.surface, borderRadius: radii.card },
    !noShadow && shadows.neo,
  ];
  return (
    <View style={[cardStyle, style]} {...props}>
      <View style={[styles.highlight, { borderColor: "rgba(255,255,255,0.06)", borderRadius: radii.card, pointerEvents: "none" }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    padding: 16,
  },
  highlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
  },
});
