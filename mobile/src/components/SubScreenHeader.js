import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { useAuthStore } from "../store/auth.store";
import { useThemeStore } from "../store/theme.store";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

/**
 * Header for sub-screens: back arrow + title (no "Back" text), optional profile pic + dropdown on the right.
 */
export default function SubScreenHeader({
  title,
  onBack,
  showProfileDropdown = true,
  navigation,
}) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = createStyles(colors, insets.top);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [menuVisible, setMenuVisible] = useState(false);
  const avatarUrl = user?.avatar_url ?? user?.avatarUrl;
  const displayName = user?.display_name ?? user?.displayName ?? "";
  const accountPrivate = user?.account_private ?? user?.accountPrivate;

  const closeMenu = () => setMenuVisible(false);

  const nav = (tab, screen, params) => {
    closeMenu();
    navigation?.navigate?.(tab, { screen, params });
  };

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {showProfileDropdown ? (
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.8}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>
                  {(displayName || "U").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.menuOverlay} onPress={closeMenu}>
          <Pressable style={[styles.menuSheet, { paddingBottom: insets.bottom + spacing.md }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.menuHandle} />
            <TouchableOpacity style={styles.menuItem} onPress={() => nav("Profile", "EditProfile", { user })} activeOpacity={0.7}>
              <MaterialIcons name="edit" size={22} color={colors.text} />
              <Text style={styles.menuItemText}>Edit profile</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {accountPrivate && (
              <TouchableOpacity style={styles.menuItem} onPress={() => nav("Profile", "FollowRequests")} activeOpacity={0.7}>
                <MaterialIcons name="people-outline" size={22} color={colors.text} />
                <Text style={styles.menuItemText}>Follow requests</Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.menuItem} onPress={() => nav("Chat", "CreateGroup")} activeOpacity={0.7}>
              <MaterialIcons name="group-add" size={22} color={colors.text} />
              <Text style={styles.menuItemText}>Create a group chat</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => nav("Chat", "CreateChannel")} activeOpacity={0.7}>
              <MaterialIcons name="campaign" size={22} color={colors.text} />
              <Text style={styles.menuItemText}>Create a channel</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => nav("Chat", "SearchJoinGroup")} activeOpacity={0.7}>
              <MaterialIcons name="search" size={22} color={colors.text} />
              <Text style={styles.menuItemText}>Search & join group</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => nav("Profile", "BlockedUsers")} activeOpacity={0.7}>
              <MaterialIcons name="block" size={22} color={colors.text} />
              <Text style={styles.menuItemText}>Blacklist</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setTheme(theme === "dark" ? "light" : "dark"); closeMenu(); }} activeOpacity={0.7}>
              <MaterialIcons name={theme === "dark" ? "light-mode" : "dark-mode"} size={22} color={colors.text} />
              <Text style={styles.menuItemText}>{theme === "dark" ? "Light mode" : "Dark mode"}</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={() => { closeMenu(); logout(); }} activeOpacity={0.7}>
              <MaterialIcons name="logout" size={22} color={colors.error || "#e53935"} />
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Log out</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(colors, paddingTop) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingTop: paddingTop + spacing.sm,
      paddingBottom: spacing.md,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 44,
      height: 44,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: -spacing.xs,
    },
    title: {
      flex: 1,
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      marginHorizontal: spacing.sm,
      fontStyle: typography.fontStyle,
    },
    avatarBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      overflow: "hidden",
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    avatarPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceLight,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarLetter: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      fontStyle: typography.fontStyle,
    },
    placeholder: { width: 40, height: 40 },
    menuOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    menuSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    menuHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: spacing.md,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuItemText: {
      flex: 1,
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      fontStyle: typography.fontStyle,
    },
    menuItemDanger: { borderBottomWidth: 0, marginTop: spacing.sm },
    menuItemTextDanger: { color: colors.error || "#e53935" },
  });
}
