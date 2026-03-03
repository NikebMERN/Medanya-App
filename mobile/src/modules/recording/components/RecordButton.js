import React from "react";
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useThemeColors } from "../../../theme/useThemeColors";

export default function RecordButton({
  isRecording,
  loading,
  disabled,
  onPressIn,
  onPressOut,
  onPress,
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <TouchableOpacity
      style={[
        styles.outer,
        isRecording && styles.outerRecording,
        (loading || disabled) && styles.outerDisabled,
      ]}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.9}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <View style={[styles.inner, isRecording && styles.innerRecording]} />
      )}
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    outer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 4,
      borderColor: "#fff",
      justifyContent: "center",
      alignItems: "center",
    },
    outerRecording: {
      borderColor: "#ef4444",
      borderWidth: 3,
    },
    outerDisabled: {
      opacity: 0.6,
    },
    inner: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "#ef4444",
    },
    innerRecording: {
      borderRadius: 8,
      width: 32,
      height: 32,
    },
  });
}
