import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import { useThemeColors } from "../../theme/useThemeColors";

export default function Avatar({ uri, name, size = 48, showRing }) {
  const colors = useThemeColors();
  const s = typeof size === "number" ? size : 48;
  const letter = name ? String(name).charAt(0).toUpperCase() : "?";
  return (
    <View style={[styles.wrap, { width: s + (showRing ? 4 : 0), height: s + (showRing ? 4 : 0) }]}>
      {showRing && <View style={[styles.ring, { width: s + 4, height: s + 4, borderRadius: (s + 4) / 2, borderColor: colors.primary }]} />}
      <View style={[styles.circle, { width: s, height: s, borderRadius: s / 2, backgroundColor: colors.surfaceLight }]}>
        {uri ? (
          <Image source={{ uri }} style={[styles.img, { width: s, height: s, borderRadius: s / 2 }]} resizeMode="cover" />
        ) : (
          <Text style={[styles.letter, { fontSize: s * 0.4, color: colors.text }]}>{letter}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: "center", alignItems: "center" },
  ring: { position: "absolute", borderWidth: 2 },
  circle: { overflow: "hidden", justifyContent: "center", alignItems: "center" },
  img: {},
  letter: { fontWeight: "700" },
});
