/**
 * Toast — User-friendly transient message (success/error/info). Renders at top of screen.
 * Use: useToastStore.getState().showToast({ type: 'error', message: '...' })
 */
import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../../theme/useThemeColors";
import { useToastStore } from "../../store/toast.store";
import { spacing } from "../../theme/spacing";

const ICONS = { success: "check-circle", error: "error-outline", info: "info-outline" };

export default function Toast() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const toast = useToastStore((s) => s.toast);
  const hideToast = useToastStore((s) => s.hideToast);
  const anim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;
    Animated.timing(anim, { toValue: 1, useNativeDriver: true, duration: 200 }).start();
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, useNativeDriver: true, duration: 150 }).start(() => hideToast());
    }, toast.duration ?? 4000);
    return () => clearTimeout(t);
  }, [toast, anim, hideToast]);

  if (!toast) return null;

  const type = toast.type || "info";
  const bg =
    type === "error"
      ? (colors.error || "#e53935")
      : type === "success"
        ? (colors.success || "#2e7d32")
        : colors.surface;
  const iconColor = type === "info" ? colors.text : "#fff";

  return (
    <Animated.View
      style={[
        styles.wrap,
        { top: insets.top + spacing.sm, marginHorizontal: spacing.md, backgroundColor: bg },
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
      ]}
    >
      <TouchableOpacity style={styles.inner} onPress={hideToast} activeOpacity={1}>
        <MaterialIcons name={ICONS[type] || ICONS.info} size={22} color={iconColor} style={styles.icon} />
        <Text style={[styles.text, { color: type === "info" ? colors.text : "#fff" }]} numberOfLines={2}>
          {toast.message}
        </Text>
        <MaterialIcons name="close" size={18} color={type === "info" ? colors.textMuted : "rgba(255,255,255,0.8)"} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 9999,
    borderRadius: 12,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 8,
        }),
  },
  inner: { flexDirection: "row", alignItems: "center", padding: spacing.md },
  icon: { marginRight: spacing.sm },
  text: { flex: 1, fontSize: 14, fontWeight: "600" },
});
