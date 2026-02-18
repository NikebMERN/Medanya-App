import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { radii, typography } from "../../theme/designSystem";
import { spacing } from "../../theme/spacing";

/**
 * Large rounded row with icon + title + subtitle (e.g. "SHOOT SHORT" / "Record a new video").
 */
export default function ActionRow({ icon, title, subtitle, onPress, style }) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.primary + "25" }]}>
        <MaterialIcons name={icon || "add"} size={28} color={colors.primary} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
      </View>
      <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.card,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  iconWrap: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", marginRight: spacing.md },
  textWrap: { flex: 1 },
  title: { ...typography.cardTitle, fontSize: 16 },
  subtitle: { ...typography.cardSubtitle, marginTop: 2 },
});
