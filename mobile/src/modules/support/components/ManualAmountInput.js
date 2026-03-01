import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useThemeColors } from "../../../theme/useThemeColors";
import { radii } from "../../../theme/designSystem";
import { spacing } from "../../../theme/spacing";

const MIN = 1;
const MAX = 99999;

export function ManualAmountInput({ value, onChange }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const handleChange = (text) => {
    const n = parseInt(String(text).replace(/\D/g, ""), 10);
    if (!isNaN(n)) onChange?.(Math.min(MAX, Math.max(MIN, n)));
    else if (text === "") onChange?.(MIN);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Amount (MC)</Text>
      <TextInput
        style={styles.input}
        value={value != null ? String(value) : ""}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={5}
        placeholder="1 - 99999"
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    wrap: {},
    label: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.sm },
    input: {
      backgroundColor: colors.inputBg,
      borderRadius: radii.input,
      padding: spacing.md,
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
}
