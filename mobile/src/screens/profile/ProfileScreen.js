import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/auth.store";
import { useThemeStore } from "../../store/theme.store";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { getMe, getFollowRequests } from "../../api/user.api";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const { user: storeUser, logout } = useAuthStore();
  const [user, setUser] = useState(storeUser);
  const [loading, setLoading] = useState(true);
  const [followRequestCount, setFollowRequestCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getMe();
        if (!cancelled && res?.user) setUser(res.user);
      } catch (_) {
        if (!cancelled) setUser(storeUser);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [storeUser?.id]);

  useEffect(() => {
    const accountPrivate = user?.account_private ?? user?.accountPrivate;
    if (!accountPrivate) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getFollowRequests();
        if (!cancelled && res?.requests?.length !== undefined) setFollowRequestCount(res.requests.length);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [user?.id, user?.account_private, user?.accountPrivate]);

  const displayName = user?.display_name ?? user?.displayName ?? "—";
  const neighborhood = user?.neighborhood ?? "—";
  const avatarUrl = user?.avatar_url ?? user?.avatarUrl;
  const bio = user?.bio ?? "";
  const followerCount = user?.followerCount ?? 0;
  const followingCount = user?.followingCount ?? 0;
  const accountPrivate = user?.account_private ?? user?.accountPrivate;

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const openEditProfile = () => {
    navigation.navigate("EditProfile", { user });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile header card - gradient style */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>
                  {(displayName !== "—" ? displayName : "YOUR PROFILE").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <MaterialIcons name="camera-alt" size={16} color={colors.white} />
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.editBtn} onPress={openEditProfile} activeOpacity={0.8}>
              <MaterialIcons name="edit" size={14} color={colors.white} />
              <Text style={styles.editLabel}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.displayName}>{displayName}</Text>
        {bio ? <Text style={styles.bioUnderPhoto}>{bio}</Text> : null}
        {neighborhood !== "—" && (
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={14} color={colors.textSecondary} />
            <Text style={styles.locationText}>{neighborhood.toUpperCase()}</Text>
          </View>
        )}
        {accountPrivate && followRequestCount > 0 && (
          <TouchableOpacity
            style={styles.followRequestsBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("FollowRequests")}
          >
            <MaterialIcons name="person-add" size={14} color={colors.white} />
            <Text style={styles.followRequestsLabel}>{followRequestCount} FOLLOW REQUEST{followRequestCount !== 1 ? "S" : ""}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <MaterialIcons name="people" size={20} color={colors.textSecondary} style={styles.statIcon} />
          <Text style={styles.statNumber}>{followerCount}</Text>
          <Text style={styles.statLabel}>FOLLOWERS</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="person-add" size={20} color={colors.textSecondary} style={styles.statIcon} />
          <Text style={styles.statNumber}>{followingCount}</Text>
          <Text style={styles.statLabel}>FOLLOWING</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="favorite" size={20} color={colors.error} style={styles.statIcon} />
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>LIKES</Text>
        </View>
      </View>

      {/* Light mode + Logout */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionCard} onPress={toggleTheme} activeOpacity={0.8}>
          <MaterialIcons name={theme === "dark" ? "light-mode" : "dark-mode"} size={28} color={colors.text} style={styles.actionIcon} />
          <Text style={styles.actionLabel}>{theme === "dark" ? "LIGHT MODE" : "DARK MODE"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={logout} activeOpacity={0.8}>
          <MaterialIcons name="logout" size={24} color={colors.error} style={styles.actionIconLogout} />
          <Text style={styles.actionLabel}>SECURE LOGOUT</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer} />
    </ScrollView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
    loader: { flex: 1, justifyContent: "center", alignItems: "center" },
    headerCard: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary + "40",
      padding: spacing.lg,
      marginBottom: spacing.lg,
      overflow: "hidden",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    avatarWrap: {
      position: "relative",
    },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 44,
    },
    avatarPlaceholder: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarLetter: {
      fontSize: 32,
      fontWeight: "800",
      color: colors.white,
    },
    cameraBadge: {
      position: "absolute",
      right: -4,
      bottom: -4,
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    cameraIcon: { fontSize: 16 },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    editBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    editLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.white,
    },
    displayName: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
      marginBottom: spacing.xs,
      letterSpacing: 0.3,
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginBottom: spacing.sm,
    },
    locationText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    bioUnderPhoto: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
      opacity: 0.95,
      marginBottom: spacing.md,
    },
    followRequestsBtn: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 6,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.primary,
      marginBottom: spacing.sm,
    },
    followRequestsLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.white,
      letterSpacing: 0.5,
    },
    statsRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      alignItems: "center",
    },
    statIcon: { marginBottom: 4 },
    statNumber: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 2,
    },
    statLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    actionRow: {
      flexDirection: "row",
      gap: spacing.md,
    },
    actionCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      alignItems: "center",
    },
    actionIcon: { marginBottom: spacing.sm },
    actionIconLogout: {
      marginBottom: spacing.sm,
    },
    actionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: 0.5,
    },
    footer: { height: spacing.xxl },
  });
}
