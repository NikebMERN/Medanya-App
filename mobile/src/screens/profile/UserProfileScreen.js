import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import * as userApi from "../../api/user.api";
import * as chatApi from "../../services/chat.api";

export default function UserProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const userId = useAuthStore((s) => s.user?.id ?? s.user?.userId) ?? "";
  const targetUserId = route.params?.userId ?? route.params?.id;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);
    try {
      const data = await userApi.getPublicProfile(targetUserId);
      setUser(data?.user ?? data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleFollow = useCallback(async () => {
    if (!user?.id || followLoading) return;
    setFollowLoading(true);
    try {
      if (user.isFollowing) {
        await userApi.unfollowUser(user.id);
        setUser((prev) => (prev ? { ...prev, isFollowing: false } : null));
      } else {
        await userApi.followUser(user.id);
        setUser((prev) => (prev ? { ...prev, isFollowing: true } : null));
      }
    } catch (e) {
      Alert.alert("Error", e?.message || "Could not update follow.");
    } finally {
      setFollowLoading(false);
    }
  }, [user, followLoading]);

  const handleBlock = useCallback(() => {
    if (!user?.id) return;
    Alert.alert(
      "Block user",
      `Block ${user.display_name ?? user.displayName ?? "this user"}? You won't see their content and they won't be able to message you.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            setBlockLoading(true);
            try {
              await userApi.blockUser(user.id);
              Alert.alert("Blocked", "User has been blocked.", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } catch (e) {
              Alert.alert("Error", e?.message || "Could not block user.");
            } finally {
              setBlockLoading(false);
            }
          },
        },
      ]
    );
  }, [user, navigation]);

  const handleMessage = useCallback(async () => {
    if (!user?.id || !(user.isFollowing && user.followsMe)) return;
    try {
      const chat = await chatApi.startDirect(user.id);
      const chatId = chat?._id ?? chat?.id;
      if (chatId) navigation.navigate("ChatRoom", { chatId });
    } catch (e) {
      Alert.alert("Error", e?.message || "Could not start chat.");
    }
  }, [user, navigation]);

  if (loading && !user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>User not found</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryLabel}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayName = user.display_name ?? user.displayName ?? "—";
  const neighborhood = user.neighborhood ?? "—";
  const avatarUrl = user.avatar_url ?? user.avatarUrl;
  const bio = user.bio ?? "";
  const followerCount = user.followerCount ?? 0;
  const followingCount = user.followingCount ?? 0;
  const isFriend = !!(user.isFollowing && user.followsMe);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>
                  {displayName !== "—" ? displayName.charAt(0).toUpperCase() : "?"}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.followBtn, user.isFollowing && styles.followingBtn]}
              onPress={handleFollow}
              disabled={followLoading}
              activeOpacity={0.8}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <MaterialIcons
                    name={user.isFollowing ? "person-check" : "person-add"}
                    size={16}
                    color={colors.white}
                  />
                  <Text style={styles.followBtnText}>
                    {user.isFollowing ? "Following" : "Follow"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.blockBtn}
              onPress={handleBlock}
              disabled={blockLoading}
              activeOpacity={0.8}
            >
              <MaterialIcons name="block" size={16} color={colors.white} />
              <Text style={styles.blockBtnText}>Block</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.displayName}>{displayName}</Text>
        {(user.phone_number ?? user.phoneNumber) ? (
          <Text style={styles.phoneText}>{user.phone_number ?? user.phoneNumber}</Text>
        ) : null}
        {bio ? <Text style={styles.bioUnderPhoto}>{bio}</Text> : null}
        {neighborhood !== "—" && (
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={14} color={colors.textSecondary} />
            <Text style={styles.locationText}>{neighborhood.toUpperCase()}</Text>
          </View>
        )}
      </View>

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
      </View>

      {isFriend && (
        <TouchableOpacity style={styles.messageBtn} onPress={handleMessage} activeOpacity={0.8}>
          <MaterialIcons name="message" size={20} color={colors.white} />
          <Text style={styles.messageBtnText}>Message</Text>
        </TouchableOpacity>
      )}

      <View style={styles.footer} />
    </ScrollView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
    loader: { flex: 1, justifyContent: "center", alignItems: "center" },
    error: { fontSize: 16, color: colors.error, textAlign: "center", marginTop: spacing.xl },
    retryBtn: { marginTop: spacing.md, alignSelf: "center", paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
    retryLabel: { fontSize: 16, fontWeight: "600", color: colors.primary },
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
    avatarWrap: { position: "relative" },
    avatar: { width: 88, height: 88, borderRadius: 44 },
    avatarPlaceholder: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarLetter: { fontSize: 32, fontWeight: "800", color: colors.white },
    headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    followBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    followingBtn: { backgroundColor: colors.textMuted, opacity: 0.9 },
    followBtnText: { fontSize: 14, fontWeight: "700", color: colors.white },
    blockBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.error || "#dc2626",
    },
    blockBtnText: { fontSize: 14, fontWeight: "700", color: colors.white },
    displayName: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
      marginBottom: spacing.xs,
      letterSpacing: 0.3,
    },
    phoneText: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginBottom: spacing.sm,
    },
    locationText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, letterSpacing: 0.5 },
    bioUnderPhoto: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
      opacity: 0.95,
      marginBottom: spacing.md,
    },
    statsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
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
    statNumber: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 2 },
    statLabel: { fontSize: 10, fontWeight: "700", color: colors.textSecondary, letterSpacing: 0.5 },
    messageBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    messageBtnText: { fontSize: 16, fontWeight: "700", color: colors.white },
    footer: { height: spacing.xxl },
  });
}
