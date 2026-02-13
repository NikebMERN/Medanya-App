import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  useWindowDimensions,
  RefreshControl,
} from "react-native";
import {
  PinchGestureHandler,
  PanGestureHandler,
  State,
} from "react-native-gesture-handler";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import SubScreenHeader from "../../components/SubScreenHeader";
import { useAuthStore } from "../../store/auth.store";
import * as Contacts from "expo-contacts";
import * as userApi from "../../api/user.api";
import * as chatApi from "../../services/chat.api";
import { ensureChatSocket, sendChatMessage } from "../../realtime/chat.socket";
import { useAuthStore as useAuthStoreForToken } from "../../store/auth.store";

function formatPhoneDisplay(phone) {
  if (!phone) return "";
  const s = String(phone).trim();
  return s.startsWith("+") ? s : `+${s}`;
}

export default function UserProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const userId = useAuthStore((s) => s.user?.id ?? s.user?.userId) ?? "";
  const targetUserId = route.params?.userId ?? route.params?.id;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [avatarFullScreenVisible, setAvatarFullScreenVisible] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const baseScaleRef = useRef(1);
  const baseTranslateXRef = useRef(0);
  const baseTranslateYRef = useRef(0);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 4;

  const openAvatarFullScreen = () => setAvatarFullScreenVisible(true);
  const closeAvatarFullScreen = () => {
    setAvatarFullScreenVisible(false);
    setZoomScale(1);
    setTranslateX(0);
    setTranslateY(0);
    baseScaleRef.current = 1;
    baseTranslateXRef.current = 0;
    baseTranslateYRef.current = 0;
  };

  const onPinchStateChange = (e) => {
    const { state, scale } = e.nativeEvent;
    if (state === State.BEGAN) baseScaleRef.current = zoomScale;
    if (state === State.END || state === State.CANCELLED) {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, baseScaleRef.current * scale));
      baseScaleRef.current = next;
      setZoomScale(next);
    }
  };
  const onPinchGestureEvent = (e) => {
    const { scale } = e.nativeEvent;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, baseScaleRef.current * scale));
    setZoomScale(next);
  };
  const onPanStateChange = (e) => {
    const { state, translationX, translationY } = e.nativeEvent;
    if (state === State.BEGAN) {
      baseTranslateXRef.current = translateX;
      baseTranslateYRef.current = translateY;
    }
    if (state === State.END || state === State.CANCELLED) {
      setTranslateX(baseTranslateXRef.current + translationX);
      setTranslateY(baseTranslateYRef.current + translationY);
      baseTranslateXRef.current = baseTranslateXRef.current + translationX;
      baseTranslateYRef.current = baseTranslateYRef.current + translationY;
    }
  };
  const onPanGestureEvent = (e) => {
    const { translationX, translationY } = e.nativeEvent;
    setTranslateX(baseTranslateXRef.current + translationX);
    setTranslateY(baseTranslateYRef.current + translationY);
  };

  const loadProfile = useCallback(async (isRefresh = false) => {
    if (!targetUserId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await userApi.getPublicProfile(targetUserId);
      setUser(data?.user ?? data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleFollow = useCallback(async () => {
    if (!user?.id || followLoading) return;
    const followRequestPending = user.followRequestPending ?? user.follow_request_pending;
    if (followRequestPending) return;
    setFollowLoading(true);
    try {
      if (user.isFollowing) {
        await userApi.unfollowUser(user.id);
        setUser((prev) => (prev ? { ...prev, isFollowing: false, followRequestPending: false } : null));
      } else {
        await userApi.followUser(user.id);
        const data = await userApi.getPublicProfile(user.id);
        const u = data?.user ?? data;
        setUser((prev) => (prev && u ? { ...prev, ...u, isFollowing: u.isFollowing, followRequestPending: u.followRequestPending ?? u.follow_request_pending } : prev));
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
    const uid = user?.id ?? user?.userId;
    if (!uid || !(user.isFollowing && user.followsMe)) return;
    try {
      const data = await chatApi.startDirect(uid);
      const chat = data?.chat ?? data;
      const chatId = chat?._id ?? chat?.id;
      if (chatId) {
        navigation.navigate("Chat", { screen: "ChatRoom", params: { chatId } });
      } else {
        Alert.alert("Error", "Could not start chat.");
      }
    } catch (e) {
      Alert.alert("Error", e?.message || "Could not start chat.");
    }
  }, [user, navigation]);

  const sendContactToUser = useCallback(
    async (contact) => {
      if (!contact || !user?.id) return;
      const uid = user.id ?? user.userId;
      const phones = (contact.phoneNumbers || []).map((p) => p?.number || p).filter(Boolean);
      const text = JSON.stringify({ name: contact.name || "", phones });
      try {
        const data = await chatApi.startDirect(uid);
        const chat = data?.chat ?? data;
        const chatId = chat?._id ?? chat?.id;
        if (!chatId) {
          Alert.alert("Error", "Could not start chat.");
          return;
        }
        const token = useAuthStoreForToken.getState().token;
        if (token) ensureChatSocket(token);
        sendChatMessage({ chatId, type: "contact", text, mediaUrl: "" }, (ack) => {
          if (ack?.ok) {
            navigation.navigate("Chat", { screen: "ChatRoom", params: { chatId } });
          } else {
            Alert.alert("Error", "Could not send contact.");
          }
        });
      } catch (e) {
        Alert.alert("Error", e?.message ?? "Could not send contact.");
      }
    },
    [user, navigation]
  );

  const handleShareContact = useCallback(async () => {
    const uid = user?.id ?? user?.userId;
    if (!uid || !(user.isFollowing && user.followsMe)) return;
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow contacts access to share a contact with this user.");
        return;
      }
      if (typeof Contacts.presentContactPickerAsync === "function") {
        const contact = await Contacts.presentContactPickerAsync();
        if (contact) await sendContactToUser(contact);
        return;
      }
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers] });
      if (!data?.length) {
        Alert.alert("No contacts", "No contacts found.");
        return;
      }
      const names = data.slice(0, 8).map((c) => c.name || "No name");
      Alert.alert("Share contact", "Pick a contact to share with this user", [
        { text: "Cancel", style: "cancel" },
        ...names.map((name, i) => ({
          text: name,
          onPress: () => sendContactToUser(data[i]),
        })),
      ]);
    } catch (e) {
      Alert.alert("Share contact", e?.message ?? "Could not share contact.");
    }
  }, [user, sendContactToUser]);

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
  const followRequestPending = user.followRequestPending ?? user.follow_request_pending ?? false;

  const followButtonLabel = followRequestPending
    ? "Requested"
    : isFriend
      ? "Friends"
      : user.isFollowing
        ? "Following"
        : "Follow";
  const followButtonIcon = followRequestPending
    ? "schedule"
    : isFriend || user.isFollowing
      ? "person"
      : "person-add";

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadProfile(true)} tintColor={colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <SubScreenHeader
        title={displayName !== "—" ? displayName : "Profile"}
        onBack={() => navigation.goBack()}
        showProfileDropdown
        navigation={navigation.getParent?.() ?? navigation}
      />
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => avatarUrl && openAvatarFullScreen()}
            activeOpacity={avatarUrl ? 0.9 : 1}
            disabled={!avatarUrl}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} key={avatarUrl} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>
                  {displayName !== "—" ? displayName.charAt(0).toUpperCase() : "?"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.followBtn,
                (user.isFollowing || followRequestPending) && styles.followingBtn,
              ]}
              onPress={handleFollow}
              disabled={followLoading || followRequestPending}
              activeOpacity={0.8}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <MaterialIcons name={followButtonIcon} size={16} color={colors.white} />
                  <Text style={styles.followBtnText}>{followButtonLabel}</Text>
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
        {!(user?.account_private ?? user?.accountPrivate) && (
          <View style={styles.idPhoneRow}>
            {(user?.id ?? user?.userId) ? (
              <Text style={styles.phoneText}>ID: {String(user?.id ?? user?.userId)}</Text>
            ) : null}
            {(user.phone_number ?? user.phoneNumber) ? (
              <Text style={styles.phoneText}>
                {formatPhoneDisplay(user.phone_number ?? user.phoneNumber)}
              </Text>
            ) : null}
          </View>
        )}
        {bio ? <Text style={styles.bioUnderPhoto}>{bio}</Text> : null}
        {neighborhood !== "—" && (
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={14} color={colors.textSecondary} />
            <Text style={styles.locationText}>{neighborhood.toUpperCase()}</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate("FollowersList", { userId: targetUserId })}
          activeOpacity={0.8}
        >
          <MaterialIcons name="people" size={20} color={colors.textSecondary} style={styles.statIcon} />
          <Text style={styles.statNumber}>{followerCount}</Text>
          <Text style={styles.statLabel}>FOLLOWERS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate("FollowingList", { userId: targetUserId })}
          activeOpacity={0.8}
        >
          <MaterialIcons name="person-add" size={20} color={colors.textSecondary} style={styles.statIcon} />
          <Text style={styles.statNumber}>{followingCount}</Text>
          <Text style={styles.statLabel}>FOLLOWING</Text>
        </TouchableOpacity>
      </View>

      {isFriend && (
        <View style={styles.messageRow}>
          <TouchableOpacity style={styles.messageBtn} onPress={handleMessage} activeOpacity={0.8}>
            <MaterialIcons name="message" size={20} color={colors.white} />
            <Text style={styles.messageBtnText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareContactBtn} onPress={handleShareContact} activeOpacity={0.8}>
            <MaterialIcons name="contacts" size={20} color={colors.primary} />
            <Text style={styles.shareContactBtnText}>Share contact</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footer} />
    </ScrollView>

    <Modal
      visible={avatarFullScreenVisible}
      transparent
      animationType="fade"
      onRequestClose={closeAvatarFullScreen}
    >
      <Pressable
        style={[styles.avatarFullScreenOverlay, { width: windowWidth, height: windowHeight }]}
        onPress={closeAvatarFullScreen}
      >
        <PinchGestureHandler
          onGestureEvent={onPinchGestureEvent}
          onHandlerStateChange={onPinchStateChange}
        >
          <View style={styles.avatarFullScreenContent}>
            <PanGestureHandler
              onGestureEvent={onPanGestureEvent}
              onHandlerStateChange={onPanStateChange}
              minPointers={1}
            >
              <View
                style={[
                  styles.avatarFullScreenImageWrap,
                  {
                    transform: [
                      { scale: zoomScale },
                      { translateX },
                      { translateY },
                    ],
                  },
                ]}
              >
                <Image
                  source={{ uri: avatarUrl }}
                  style={[
                    styles.avatarFullScreenImage,
                    { width: windowWidth, height: windowWidth, maxHeight: windowHeight },
                  ]}
                  resizeMode="contain"
                />
              </View>
            </PanGestureHandler>
          </View>
        </PinchGestureHandler>

        <TouchableOpacity
          style={styles.avatarFullScreenClose}
          onPress={closeAvatarFullScreen}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
          <MaterialIcons name="close" size={28} color={colors.white} />
        </TouchableOpacity>
      </Pressable>
    </Modal>
  </>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
    backRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.md,
      gap: spacing.xs,
    },
    backLabel: { fontSize: 17, fontWeight: "600", color: colors.text },
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
    idPhoneRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    phoneText: {
      fontSize: 12,
      color: colors.textMuted,
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
    messageRow: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    messageBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    messageBtnText: { fontSize: 16, fontWeight: "700", color: colors.white },
    shareContactBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: spacing.md,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: "transparent",
    },
    shareContactBtnText: { fontSize: 16, fontWeight: "700", color: colors.primary },
    footer: { height: spacing.xxl },
    avatarFullScreenOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.95)",
      justifyContent: "center",
      alignItems: "center",
    },
    avatarFullScreenContent: {
      justifyContent: "center",
      alignItems: "center",
    },
    avatarFullScreenImageWrap: {
      justifyContent: "center",
      alignItems: "center",
    },
    avatarFullScreenImage: {
      backgroundColor: "transparent",
    },
    avatarFullScreenClose: {
      position: "absolute",
      top: 52,
      right: spacing.md,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(255,255,255,0.2)",
      justifyContent: "center",
      alignItems: "center",
    },
  });
}
