import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useThemeColors } from "../theme/useThemeColors";
import { spacing } from "../theme/spacing";

/**
 * Text input + send button. No media upload in this phase.
 */
export default function ChatInput({ onSend, disabled }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = (text || "").trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={4096}
          editable={!disabled}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || disabled) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
        >
          <Text style={styles.sendLabel}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    input: {
      flex: 1,
      minHeight: 40,
      maxHeight: 100,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginRight: spacing.sm,
      borderRadius: 20,
      backgroundColor: colors.surfaceLight,
      color: colors.text,
      fontSize: 15,
    },
    sendBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      justifyContent: "center",
      borderRadius: 20,
      backgroundColor: colors.primary,
    },
    sendBtnDisabled: {
      opacity: 0.5,
    },
    sendLabel: {
      color: colors.white,
      fontWeight: "600",
      fontSize: 14,
    },
  });
}
