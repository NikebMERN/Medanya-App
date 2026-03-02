import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { radii } from "../../theme/designSystem";
import { spacing } from "../../theme/spacing";
import { normalizePlaceholder } from "./Input";
import { inputStyleAndroid } from "../../theme/inputStyles";

export default function SearchBar({ placeholder = "Search...", value, onChangeText, style, ...props }) {
  const colors = useThemeColors();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface || colors.inputBg, borderColor: colors.border }]}>
      <MaterialIcons name="search" size={20} color={colors.textMuted} style={styles.icon} />
      <TextInput
        style={[styles.input, inputStyleAndroid, { color: colors.text }]}
        placeholder={normalizePlaceholder(placeholder)}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  icon: { marginRight: spacing.sm },
  input: { flex: 1, fontSize: 15, paddingVertical: 10 },
});
