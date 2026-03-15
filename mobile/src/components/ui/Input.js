import React from "react";
import { View, TextInput, Text, StyleSheet, Platform } from "react-native";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { borderRadius } from "../../theme/spacing";

/** Normalize placeholder: single spaces, no leading/trailing. */
export function normalizePlaceholder(s) {
  if (s == null || typeof s !== "string") return s;
  return s.replace(/\s+/g, " ").trim();
}

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
  onSubmit,
}) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const normalizedPlaceholder = normalizePlaceholder(placeholder);
  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrap, multiline && styles.inputWrapMultiline]}>
        {leftComponent ? <View style={styles.side}>{leftComponent}</View> : null}
        <TextInput
          style={[styles.input, leftComponent && styles.inputWithLeft, rightComponent && styles.inputWithRight, multiline && styles.inputMultiline, Platform.OS === "android" && styles.inputAndroid]}
          value={value}
          onChangeText={onChangeText}
          placeholder={normalizedPlaceholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          selectionColor={colors.primary}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onSubmitEditing={onSubmit}
          blurOnSubmit={!multiline}
          returnKeyType={onSubmit ? "done" : "default"}
        />
        {rightComponent ? <View style={styles.side}>{rightComponent}</View> : null}
      </View>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    wrap: { marginBottom: spacing.md, ...(Platform.OS === "web" && { maxWidth: "100%", overflow: "hidden" }) },
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
      ...(Platform.OS === "web" && { overflow: "hidden", maxWidth: "100%" }),
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
      minWidth: 0,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: colors.text,
      fontSize: 16,
      ...(Platform.OS === "web" && { maxWidth: "100%", lineHeight: 20 }),
    },
    inputAndroid: {
      includeFontPadding: false,
    },
    inputWithLeft: { paddingLeft: 0 },
    inputWithRight: { paddingRight: 0 },
    side: { paddingHorizontal: spacing.sm },
  });
}
