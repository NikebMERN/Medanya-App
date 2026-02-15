import React, { useState, useMemo, memo } from "react";
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
import { typography } from "../theme/typography";
import { useAuthStore } from "../store/auth.store";
import { useThemeStore } from "../store/theme.store";
import { spacing } from "../theme/spacing";

function AppHeaderComponent({ navigation, route, focusedRouteName }) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.top, insets.bottom), [colors, insets.top, insets.bottom]);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const avatarUrl = user?.avatar_url ?? user?.avatarUrl;
  const displayName = user?.display_name ?? user?.displayName ?? "";
  const accountPrivate = user?.account_private ?? user?.accountPrivate;
  const kycFaceVerified = user?.kyc_face_verified ?? user?.kycFaceVerified ?? false;
  const [menuVisible, setMenuVisible] = useState(false);

  const handleLogoPress = () => {
    if (navigation?.navigate) {
      navigation.navigate("Home");
    }
  };

  const closeMenu = () => setMenuVisible(false);

  const handleEditProfile = () => {
    closeMenu();
    navigation?.navigate("Profile", { screen: "EditProfile", params: { user } });
  };

  const handleFollowRequests = () => {
    closeMenu();
    navigation?.navigate("Profile", { screen: "FollowRequests" });
  };

  const handleCreateGroupChat = () => {
    closeMenu();
    navigation?.navigate("Chat", { screen: "CreateGroup" });
  };

  const handleCreateChannel = () => {
    closeMenu();
    navigation?.navigate("Chat", { screen: "CreateChannel" });
  };

  const handleSearchJoinGroup = () => {
    closeMenu();
    navigation?.navigate("Chat", { screen: "SearchJoinGroup" });
  };

  const handleBlacklist = () => {
    closeMenu();
    navigation?.navigate("Profile", { screen: "BlockedUsers" });
  };

  const handlePostJob = () => {
    closeMenu();
    navigation?.navigate("Jobs", { screen: "CreateJob" });
  };

  const handleSellItem = () => {
    closeMenu();
    navigation?.navigate("Marketplace", { screen: "CreateItem" });
  };

  const handleToggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
    closeMenu();
  };

  const handleLogout = () => {
    closeMenu();
    logout();
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.left}>
          <TouchableOpacity style={styles.logoWrap} onPress={handleLogoPress} activeOpacity={0.8}>
            <View style={styles.logo}>
              <Text style={styles.logoLetter}>M</Text>
            </View>
            <Text style={styles.title}>MEDANYA</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.right}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
            <Text style={styles.playIcon}>▶</Text>
          </TouchableOpacity>
          <TouchableOpacity
              style={styles.avatarBtn}
              activeOpacity={0.8}
              onPress={() => setMenuVisible(true)}
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
        </View>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.menuOverlay} onPress={closeMenu}>
          <Pressable style={[styles.menuSheet, { paddingBottom: insets.bottom + spacing.md }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.menuHandle} />
            <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile} activeOpacity={0.7}>
              <MaterialIcons name="edit" size={22} color={colors.text} />
              <Text style={styles.menuItemText}>Edit profile</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {kycFaceVerified && (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={handlePostJob} activeOpacity={0.7}>
                  <MaterialIcons name="work" size={22} color={colors.text} />
                  <Text style={styles.menuItemText}>Post a job</Text>
                  <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={handleSellItem} activeOpacity={0.7}>
                  <MaterialIcons name="storefront" size={22} color={colors.text} />
                  <Text style={styles.menuItemText}>Sell an item</Text>
                  <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </>
            )}
            {accountPrivate && (
              <TouchableOpacity style={styles.menuItem} onPress={handleFollowRequests} activeOpacity={0.7}>
                <MaterialIcons name="people-outline" size={22} color={colors.text} />
                <Text style={styles.menuItemText}>Follow requests</Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.menuItem} onPress={handleCreateGroupChat} activeOpacity={0.7}>
              <MaterialIcons name="group-add" size={22} color={colors.text} />
              <Text style={styles.menuItemText}>Create a group chat</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleCreateChannel} activeOpacity={0.7}>
              <MaterialIcons name="campaign" size={22} color={colors.text} />
              <Text style={styles.menuItemText}>Create a channel</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleSearchJoinGroup} activeOpacity={0.7}>
              <MaterialIcons name="search" size={22} color={colors.text} />
              <Text style={styles.menuItemText}>Search & join group</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleBlacklist} activeOpacity={0.7}>
              <MaterialIcons name="block" size={22} color={colors.text} />
              <Text style={styles.menuItemText}>Blacklist</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleToggleTheme} activeOpacity={0.7}>
              <MaterialIcons name={theme === "dark" ? "light-mode" : "dark-mode"} size={22} color={colors.text} />
              <Text style={styles.menuItemText}>{theme === "dark" ? "Light mode" : "Dark mode"}</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={handleLogout} activeOpacity={0.7}>
              <MaterialIcons name="logout" size={22} color={colors.error || "#e53935"} />
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Log out</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(colors, paddingTop, paddingBottom = 0) {
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
    left: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    logoWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    logo: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    logoLetter: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.white,
      fontStyle: typography.fontStyle,
    },
    title: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: 0.5,
      fontStyle: typography.fontStyle,
    },
    right: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    playIcon: {
      fontSize: 12,
      color: colors.text,
      marginLeft: 2,
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
    menuItemDanger: {
      borderBottomWidth: 0,
      marginTop: spacing.sm,
    },
    menuItemTextDanger: {
      color: colors.error || "#e53935",
    },
  });
}

export default memo(AppHeaderComponent);
