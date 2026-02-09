import React from "react";
import { View, TextInput, Text, StyleSheet } from "react-native";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { borderRadius } from "../../theme/spacing";

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "none",
  leftComponent,
  rightComponent,
  editable = true,
  style,
  multiline,
  numberOfLines,
}) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrap, multiline && styles.inputWrapMultiline]}>
        {leftComponent ? <View style={styles.side}>{leftComponent}</View> : null}
        <TextInput
          style={[styles.input, leftComponent && styles.inputWithLeft, rightComponent && styles.inputWithRight, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          selectionColor={colors.primary}
          multiline={multiline}
          numberOfLines={numberOfLines}
        />
        {rightComponent ? <View style={styles.side}>{rightComponent}</View> : null}
      </View>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    wrap: { marginBottom: spacing.md },
    label: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 0.5,
      marginBottom: spacing.xs,
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 52,
    },
    inputWrapMultiline: {
      alignItems: "flex-start",
      minHeight: 80,
    },
    inputMultiline: {
      minHeight: 72,
      textAlignVertical: "top",
    },
    input: {
      flex: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: colors.text,
      fontSize: 16,
    },
    inputWithLeft: { paddingLeft: 0 },
    inputWithRight: { paddingRight: 0 },
    side: { paddingHorizontal: spacing.sm },
  });
}
