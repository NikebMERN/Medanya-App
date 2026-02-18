import React, { useRef, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { spacing } from "../theme/spacing";
import { useChatStore } from "../store/chat.store";

const TAB_CONFIG = [
  { name: "Home", label: "HOME", icon: "home", rootScreen: null },
  { name: "Jobs", label: "JOBS", icon: "work", rootScreen: "JobsList" },
  { name: "Marketplace", label: "MARKET", icon: "storefront", rootScreen: "MarketplaceList" },
  { name: "Safety", label: "SAFETY", icon: "shield", rootScreen: "SafetyHub" },
  { name: "Chat", label: "CHAT", icon: "chat", rootScreen: "Chats" },
  { name: "Profile", label: "PROFILE", icon: "person", rootScreen: "ProfileMain" },
];

export default function AppTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
  const unreadByChatId = useChatStore((s) => s.unreadByChatId) || {};
  const totalUnread = useMemo(
    () => Object.values(unreadByChatId).reduce((sum, n) => sum + Math.max(0, Number(n) || 0), 0),
    [unreadByChatId]
  );
  const scaleAnims = useRef({}).current;

  const getScaleAnim = (key) => {
    if (!scaleAnims[key]) scaleAnims[key] = new Animated.Value(1);
    return scaleAnims[key];
  };

  const handleTabPress = (route, globalIndex) => {
    const isFocused = state.index === globalIndex;
    const config = TAB_CONFIG[globalIndex];
    const scale = getScaleAnim(route.key);

    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();

    if (isFocused) {
      const refreshParam = { refresh: Date.now() };
      if (config?.rootScreen) {
        navigation.navigate(route.name, { screen: config.rootScreen, params: refreshParam });
      } else {
        navigation.navigate(route.name, refreshParam);
      }
    } else {
      navigation.navigate(route.name);
    }
  };

  const leftTabs = state.routes.slice(0, 3);
  const rightTabs = state.routes.slice(3, 6);

  const renderTab = (route, globalIndex) => {
    const isFocused = state.index === globalIndex;
    const config = TAB_CONFIG[globalIndex];
    const scale = getScaleAnim(route.key);
    const showUnreadBadge = route.name === "Chat" && totalUnread > 0;

    return (
      <TouchableOpacity
        key={route.key}
        style={styles.tab}
        onPress={() => handleTabPress(route, globalIndex)}
        activeOpacity={1}
      >
        <Animated.View
          style={[
            styles.iconWrap,
            isFocused && styles.iconWrapActive,
            { transform: [{ scale }] },
          ]}
        >
          <MaterialIcons
            name={config?.icon ?? "circle"}
            size={22}
            color={isFocused ? colors.primary : colors.textSecondary}
          />
          {showUnreadBadge && (
            <View style={[styles.tabBadge, { backgroundColor: colors.unreadIndicatorBlue || "#3b82f6" }]}>
              <Text style={styles.tabBadgeText} numberOfLines={1}>
                {totalUnread > 99 ? "99+" : totalUnread}
              </Text>
            </View>
          )}
        </Animated.View>
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
          <TouchableOpacity
            style={styles.fab}
            activeOpacity={0.8}
            onPress={() => navigation.getParent()?.navigate?.("Create")}
          >
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
      position: "relative",
    },
    tabBadge: {
      position: "absolute",
      top: -6,
      right: -8,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 4,
    },
    tabBadgeText: {
      color: "#fff",
      fontSize: 10,
      fontWeight: "700",
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
