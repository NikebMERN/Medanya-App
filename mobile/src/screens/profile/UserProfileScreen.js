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
import ReportOptionsModal from "../../components/common/ReportOptionsModal";
import { useAuthStore } from "../../store/auth.store";
import * as userApi from "../../api/user.api";
import { trackEvent } from "../../utils/trackEvent";
import * as chatApi from "../../services/chat.api";
import { ensureChatSocket, sendChatMessage } from "../../realtime/chat.socket";
import { useAuthStore as useAuthStoreForToken } from "../../store/auth.store";
import { useChatStore } from "../../store/chat.store";

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
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const isOwnProfile = !targetUserId || String(targetUserId) === String(userId);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [avatarFullScreenVisible, setAvatarFullScreenVisible] = useState(false);
  const [shareProfileVisible, setShareProfileVisible] = useState(false);
  const [shareProfileSelected, setShareProfileSelected] = useState({});
  const [shareProfileSending, setShareProfileSending] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const baseScaleRef = useRef(1);
  const baseTranslateXRef = useRef(0);
  const baseTranslateYRef = useRef(0);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const chats = useChatStore((s) => s.chats);
  const setChats = useChatStore((s) => s.setChats);
  const participantProfiles = useChatStore((s) => s.participantProfiles);
  const unreadByChatId = useChatStore((s) => s.unreadByChatId) || {};

  const chatWithUser = useMemo(() => {
    if (!targetUserId || !chats?.length) return null;
    return chats.find(
      (c) => c.type === "direct" && (c.participants || []).some((p) => String(p) === String(targetUserId))
    ) || null;
  }, [chats, targetUserId]);
  const unreadWithUser = chatWithUser ? Math.max(0, Number(unreadByChatId[String(chatWithUser._id || chatWithUser.id)]) || 0) : 0;

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
        trackEvent("follow", "profile", user.id);
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

  const shareChatsSorted = useMemo(() => {
    const list = [...(chats || [])];
    return list.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
  }, [chats]);

  const openShareProfileModal = useCallback(async () => {
    setShareProfileVisible(true);
    setShareProfileSelected({});
    try {
      const res = await chatApi.listChats({ limit: 100 });
      if (res?.chats?.length) setChats(res.chats);
    } catch (_) {}
  }, [setChats]);

  const getShareChatTitle = useCallback((c) => {
    if (c.type === "group") return c.groupName || "Group";
    const otherId = (c.participants || []).find((p) => String(p) !== String(userId));
    if (!otherId) return "Direct chat";
    const profile = participantProfiles[String(otherId)];
    return profile?.displayName ?? `User ${otherId}`;
  }, [userId, participantProfiles]);

  const getShareChatAvatarUrl = useCallback((c) => {
    if (c.type === "group") return null;
    const otherId = (c.participants || []).find((p) => String(p) !== String(userId));
    return otherId ? participantProfiles[String(otherId)]?.avatarUrl : null;
  }, [userId, participantProfiles]);

  const toggleShareChat = useCallback((chatId) => {
    setShareProfileSelected((prev) => ({ ...prev, [chatId]: !prev[chatId] }));
  }, []);

  const handleShareProfileToChats = useCallback(async () => {
    const uid = user?.id ?? user?.userId;
    if (!uid) return;
    const selectedIds = Object.keys(shareProfileSelected).filter((id) => shareProfileSelected[id]);
    if (selectedIds.length === 0) {
      Alert.alert("Select chats", "Select at least one chat to share this profile to.");
      return;
    }
    const accountPrivate = !!(user?.account_private ?? user?.accountPrivate);
    const profilePayload = {
      userId: uid,
      id: uid,
      displayName: user?.display_name ?? user?.displayName ?? "User",
      avatarUrl: user?.avatar_url ?? user?.avatarUrl ?? "",
      accountPrivate: accountPrivate,
    };
    if (!accountPrivate) {
      if (user?.id ?? user?.userId) profilePayload.id = String(user?.id ?? user?.userId);
      const phone = user?.phone_number ?? user?.phoneNumber ?? "";
      if (phone) profilePayload.phone = phone.trim().startsWith("+") ? phone.trim() : `+${phone.trim()}`;
    }
    const text = JSON.stringify(profilePayload);
    setShareProfileSending(true);
    const token = useAuthStoreForToken.getState().token;
    if (token) ensureChatSocket(token);
    let done = 0;
    let failed = 0;
    const total = selectedIds.length;
    selectedIds.forEach((chatId) => {
      sendChatMessage({ chatId, type: "profile", text, mediaUrl: "" }, (ack) => {
        if (ack?.ok) done++;
        else failed++;
        if (done + failed === total) {
          setShareProfileSending(false);
          setShareProfileVisible(false);
          setShareProfileSelected({});
          if (done > 0) {
            Alert.alert("Shared", `Profile shared to ${done} chat${done !== 1 ? "s" : ""}.${failed > 0 ? ` ${failed} failed.` : ""}`);
            if (done === 1) navigation.navigate("Chat", { screen: "ChatRoom", params: { chatId: selectedIds[0] } });
          } else {
            Alert.alert("Error", "Could not share profile to any chat.");
          }
        }
      });
    });
  }, [user, shareProfileSelected, navigation]);

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
    <View style={styles.container}>
      <SubScreenHeader
        title={displayName !== "—" ? displayName : "Profile"}
        onBack={() => navigation.goBack()}
        showProfileDropdown
        navigation={navigation.getParent?.() ?? navigation}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadProfile(true)} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
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
              {!isOwnProfile && (
                <TouchableOpacity
                  style={styles.reportBtn}
                  onPress={() => setReportModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="flag" size={16} color={colors.white} />
                  <Text style={styles.reportBtnText}>Report</Text>
                </TouchableOpacity>
              )}
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
              <View style={styles.messageBtnInner}>
                <MaterialIcons name="message" size={20} color={colors.white} />
                {unreadWithUser > 0 && (
                  <View style={[styles.unreadDot, { backgroundColor: colors.unreadIndicatorBlue || "#3b82f6" }]}>
                    <Text style={styles.unreadDotText}>{unreadWithUser > 99 ? "99+" : unreadWithUser}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.messageBtnText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareContactBtn} onPress={openShareProfileModal} activeOpacity={0.8}>
              <MaterialIcons name="share" size={20} color={colors.primary} />
              <Text style={styles.shareContactBtnText}>Share profile</Text>
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

      <ReportOptionsModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        targetType="user"
        targetId={targetUserId}
        targetUserId={targetUserId}
        onBlocked={() => {
          setReportModalVisible(false);
          loadProfile(true);
        }}
      />
      <Modal visible={shareProfileVisible} transparent animationType="slide" onRequestClose={() => !shareProfileSending && setShareProfileVisible(false)}>
        <Pressable style={styles.shareProfileOverlay} onPress={() => !shareProfileSending && setShareProfileVisible(false)}>
          <Pressable style={[styles.shareProfileSheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.md }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.shareProfileHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.shareProfileTitle, { color: colors.text }]}>Share profile to</Text>
            <Text style={[styles.shareProfileSub, { color: colors.textMuted }]}>Select one or more chats</Text>
            <ScrollView style={styles.shareProfileList} keyboardShouldPersistTaps="handled">
              {shareChatsSorted.length === 0 ? (
                <Text style={[styles.shareProfileEmpty, { color: colors.textMuted }]}>No chats yet</Text>
              ) : (
                shareChatsSorted.map((c) => {
                  const cid = c._id || c.id;
                  const title = getShareChatTitle(c);
                  const subtitle = c.lastMessagePreview || "No message yet";
                  const avatarUrl = getShareChatAvatarUrl(c);
                  const selected = !!shareProfileSelected[String(cid)];
                  return (
                    <TouchableOpacity
                      key={cid}
                      style={[styles.shareProfileItem, { borderBottomColor: colors.border }]}
                      onPress={() => toggleShareChat(String(cid))}
                      activeOpacity={0.7}
                    >
                      {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.shareProfileAvatar} />
                      ) : (
                        <View style={[styles.shareProfileAvatar, styles.shareProfileAvatarPlaceholder]}>
                          <Text style={styles.shareProfileAvatarLetter}>{title.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={styles.shareProfileItemBody}>
                        <Text style={[styles.shareProfileItemText, { color: colors.text }]} numberOfLines={1}>{title}</Text>
                        <Text style={[styles.shareProfileItemSub, { color: colors.textMuted }]} numberOfLines={1}>{subtitle}</Text>
                      </View>
                      <MaterialIcons name={selected ? "check-circle" : "radio-button-unchecked"} size={26} color={selected ? colors.primary : colors.textMuted} />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <View style={styles.shareProfileActions}>
              <TouchableOpacity style={styles.shareProfileCancelBtn} onPress={() => setShareProfileVisible(false)} disabled={shareProfileSending}>
                <Text style={[styles.shareProfileCancelText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shareProfileSendBtn, { backgroundColor: colors.primary }]}
                onPress={handleShareProfileToChats}
                disabled={shareProfileSending || Object.values(shareProfileSelected).every((v) => !v)}
              >
                {shareProfileSending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.shareProfileSendText}>Share</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
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
    reportBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.warning || "#f59e0b",
    },
    reportBtnText: { fontSize: 14, fontWeight: "700", color: colors.white },
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
    messageBtnInner: { position: "relative" },
    unreadDot: {
      position: "absolute",
      top: -6,
      right: -10,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 4,
    },
    unreadDotText: { color: "#fff", fontSize: 10, fontWeight: "700" },
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
    shareProfileOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "flex-end",
    },
    shareProfileSheet: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: spacing.sm,
      paddingHorizontal: spacing.md,
      maxHeight: "80%",
    },
    shareProfileHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: spacing.md,
    },
    shareProfileTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
    shareProfileSub: { fontSize: 13, marginBottom: spacing.md },
    shareProfileList: { maxHeight: 320, marginBottom: spacing.md },
    shareProfileEmpty: { paddingVertical: spacing.lg, textAlign: "center" },
    shareProfileItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
      gap: spacing.sm,
      borderBottomWidth: 1,
    },
    shareProfileAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    shareProfileAvatarPlaceholder: {
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    shareProfileAvatarLetter: { color: colors.white, fontSize: 18, fontWeight: "700" },
    shareProfileItemBody: { flex: 1, minWidth: 0 },
    shareProfileItemText: { fontSize: 16, fontWeight: "600" },
    shareProfileItemSub: { fontSize: 13, marginTop: 2 },
    shareProfileActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: spacing.md },
    shareProfileCancelBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
    shareProfileCancelText: { fontSize: 16 },
    shareProfileSendBtn: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: 12,
      minWidth: 100,
      alignItems: "center",
    },
    shareProfileSendText: { fontSize: 16, fontWeight: "700", color: colors.white },
  });
}
