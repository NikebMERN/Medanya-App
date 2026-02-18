import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { typography } from "../../theme/designSystem";
import { spacing } from "../../theme/spacing";

/**
 * Top bar: left logo + app name, right play icon + profile avatar.
 */
export default function TopBar({ onLogoPress, onPlayPress, onProfilePress, avatarUri, displayName }) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm, paddingBottom: spacing.md }]}>
      <TouchableOpacity style={styles.left} onPress={onLogoPress} activeOpacity={0.8}>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}>
          <Text style={styles.logoLetter}>M</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>MEDANYA</Text>
      </TouchableOpacity>
      <View style={styles.right}>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.surface }]} onPress={onPlayPress} activeOpacity={0.8}>
          <MaterialIcons name="play-arrow" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onProfilePress} activeOpacity={0.8}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceLight }]}>
              <Text style={[styles.avatarLetter, { color: colors.text }]}>{(displayName || "U").charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  left: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logo: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  logoLetter: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  title: { ...typography.appTitle, fontSize: 18 },
  right: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  avatarLetter: { fontSize: 16, fontWeight: "700" },
});
