import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { spacing } from "../theme/spacing";

const TAB_CONFIG = [
  { name: "Home", label: "HOME", icon: "home" },
  { name: "Jobs", label: "JOBS", icon: "work" },
  { name: "Videos", label: "VIDEOS", icon: "video-library" },
  { name: "Live", label: "SAFETY", icon: "shield" },
  { name: "Chat", label: "CHAT", icon: "chat" },
  { name: "Profile", label: "PROFILE", icon: "person" },
];

export default function AppTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = createStyles(colors, insets.bottom);

  const leftTabs = state.routes.slice(0, 3);
  const rightTabs = state.routes.slice(3, 6);

  const renderTab = (route, globalIndex) => {
    const isFocused = state.index === globalIndex;
    const config = TAB_CONFIG[globalIndex];
    const { options } = descriptors[route.key];

    return (
      <TouchableOpacity
        key={route.key}
        style={styles.tab}
        onPress={() => navigation.navigate(route.name)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
          <MaterialIcons
            name={config?.icon ?? "circle"}
            size={22}
            color={isFocused ? colors.primary : colors.textSecondary}
          />
        </View>
        <Text style={[styles.label, isFocused && styles.labelActive]} numberOfLines={1}>
          {config?.label ?? route.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {leftTabs.map((route, index) => renderTab(route, index))}
        <View style={styles.fabWrap}>
          <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
            <MaterialIcons name="add" size={28} color={colors.white} />
          </TouchableOpacity>
        </View>
        {rightTabs.map((route, index) => renderTab(route, index + 3))}
      </View>
    </View>
  );
}

function createStyles(colors, paddingBottom) {
  return StyleSheet.create({
    container: {
      paddingBottom: paddingBottom || spacing.md,
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.sm,
      backgroundColor: colors.background,
    },
    bar: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
      minHeight: 64,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "flex-end",
      paddingBottom: 4,
    },
    iconWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 2,
    },
    iconWrapActive: {
      backgroundColor: colors.primary + "30",
    },
    label: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.textSecondary,
      letterSpacing: 0.3,
    },
    labelActive: {
      color: colors.primary,
    },
    fabWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "flex-end",
      paddingBottom: 4,
    },
    fab: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      marginTop: -20,
    },
  });
}
