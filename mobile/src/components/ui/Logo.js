import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";

export default function Logo({ small }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  return (
    <View style={styles.wrap}>
      <View style={[styles.icon, small && styles.iconSmall]}>
        <Text style={[styles.check, small && styles.checkSmall]}>✓</Text>
      </View>
      <Text style={[styles.name, small && styles.nameSmall]}>
        MEDANYA <Text style={styles.nameAccent}>APP</Text>
      </Text>
      <Text style={[styles.tagline, small && styles.taglineSmall]}>
        COMMUNITY SAFETY & EMPOWERMENT
      </Text>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    wrap: { alignItems: "center", marginBottom: spacing.lg },
    icon: {
      width: 72,
      height: 72,
      borderRadius: 16,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    iconSmall: { width: 56, height: 56, marginBottom: spacing.sm },
    check: { color: colors.white, fontSize: 36, fontWeight: "700" },
    checkSmall: { fontSize: 28 },
    name: { fontSize: 24, fontWeight: "800", color: colors.text, letterSpacing: 1 },
    nameSmall: { fontSize: 20 },
    nameAccent: { color: colors.primary },
    tagline: {
      fontSize: 11,
      color: colors.textSecondary,
      letterSpacing: 0.5,
      marginTop: 4,
    },
    taglineSmall: { fontSize: 10 },
  });
}
