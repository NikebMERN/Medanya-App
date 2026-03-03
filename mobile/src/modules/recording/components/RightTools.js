import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../../theme/useThemeColors";
import { spacing } from "../../../theme/spacing";

export default function RightTools({
  onFlip,
  onSpeed,
  onBeauty,
  onTimer,
  onFlash,
  onUpload,
  flashOn,
  timerSec,
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const tools = [
    { key: "flip", icon: "flip-camera-ios", onPress: onFlip },
    { key: "speed", icon: "speed", onPress: onSpeed },
    { key: "beauty", icon: "face-retouching-natural", onPress: onBeauty },
    { key: "timer", icon: "timer", onPress: onTimer, active: timerSec > 0, label: timerSec > 0 ? `${timerSec}s` : null },
    { key: "flash", icon: flashOn ? "flash-on" : "flash-off", onPress: onFlash, active: flashOn },
    { key: "upload", icon: "upload", onPress: onUpload },
  ];

  return (
    <View style={styles.container}>
      {tools.map((t) => (
        <TouchableOpacity
          key={t.key}
          style={[styles.toolBtn, t.active && styles.toolBtnActive]}
          onPress={t.onPress}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name={t.icon}
            size={26}
            color={t.active ? colors.primary : colors.text}
          />
          {t.label && <Text style={styles.toolLabel}>{t.label}</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      position: "absolute",
      right: spacing.sm,
      top: "20%",
      bottom: "30%",
      justifyContent: "space-between",
      alignItems: "center",
    },
    toolBtn: {
      width: 48,
      height: 48,
      justifyContent: "center",
      alignItems: "center",
    },
    toolBtnActive: {},
    toolLabel: {
      fontSize: 10,
      color: colors.primary,
      fontWeight: "700",
      marginTop: -2,
    },
  });
}
