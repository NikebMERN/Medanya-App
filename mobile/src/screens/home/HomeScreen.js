import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useHomeStore, TABS } from "../../store/home.store";
import { useChatStore } from "../../store/chat.store";
import { useAuthStore } from "../../store/auth.store";
import JobCard from "../../components/feed/JobCard";
import MissingCard from "../../components/feed/MissingCard";
import AlertCard from "../../components/feed/AlertCard";
import MarketCard from "../../components/feed/MarketCard";
import VideoPreviewCard from "../../components/feed/VideoPreviewCard";
import * as chatApi from "../../services/chat.api";
import { ensureChatSocket, sendChatMessage } from "../../realtime/chat.socket";

function LiveHeroCard({ stream, onPress, colors }) {
  const styles = useMemo(() => heroStyles(colors), [colors]);
  if (!stream) return null;
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(stream)} activeOpacity={0.9}>
      <View style={styles.badge}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE</Text>
      </View>
      <Text style={styles.title} numberOfLines={1}>{stream.title || "Live"}</Text>
      <Text style={styles.meta}>{stream.viewerCount ?? 0} watching</Text>
    </TouchableOpacity>
  );
}

function heroStyles(colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.primary + "18",
      borderRadius: 12,
      padding: spacing.md,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.primary + "40",
    },
    badge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginBottom: 6 },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error || "#e53935", marginRight: 6 },
    liveText: { fontSize: 12, fontWeight: "800", color: colors.error || "#e53935", letterSpacing: 0.5 },
    title: { fontSize: 16, fontWeight: "700", color: colors.text },
    meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  });
}

function CategoryChips({ selectedTab, onSelect, colors }) {
  const styles = useMemo(() => chipStyles(colors), [colors]);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scroll}
    >
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.chip, selectedTab === tab.id && styles.chipActive]}
          onPress={() => onSelect(tab.id)}
          activeOpacity={0.8}
        >
          <Text style={[styles.chipText, selectedTab === tab.id && styles.chipTextActive]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function chipStyles(colors) {
  return StyleSheet.create({
    scroll: { flexGrow: 0 },
    container: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm, flexDirection: "row", alignItems: "center", flexWrap: "nowrap" },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      minHeight: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: spacing.sm,
    },
    chipActive: { backgroundColor: colors.primary + "25", borderColor: colors.primary },
    chipText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
    chipTextActive: { color: colors.primary },
  });
}

function ActiveNowRow({ streams, onPress, colors }) {
  const styles = useMemo(() => activeStyles(colors), [colors]);
  if (!streams?.length) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ACTIVE NOW</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {streams.slice(0, 10).map((s) => (
          <TouchableOpacity key={s.streamId} style={styles.avatarWrap} onPress={() => onPress(s)} activeOpacity={0.8}>
            <View style={styles.avatar}>
              <MaterialIcons name="videocam" size={20} color={colors.primary} />
            </View>
            <Text style={styles.name} numberOfLines={1}>{s.title || "Live"}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function activeStyles(colors) {
  return StyleSheet.create({
    section: { marginBottom: spacing.md },
    sectionTitle: { fontSize: 12, fontWeight: "800", color: colors.textMuted, letterSpacing: 0.5, marginLeft: spacing.md, marginBottom: spacing.xs },
    row: { paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm },
    avatarWrap: { alignItems: "center", marginRight: spacing.md },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary, justifyContent: "center", alignItems: "center" },
    name: { fontSize: 11, fontWeight: "600", color: colors.text, marginTop: 4, maxWidth: 56 },
  });
}

function FeedCard({ item, onPress, onShare, colors }) {
  const { type, data } = item;

  switch (type) {
    case "JOB":
      return (
        <JobCard
          data={data}
          onPress={() => onPress(item)}
          onChat={() => onPress(item)}
          onApply={() => onPress(item)}
          onShare={onShare ? () => onShare(item) : undefined}
        />
      );
    case "MISSING":
      return (
        <MissingCard
          data={data}
          onPress={() => onPress(item)}
          onCall={() => {}}
          onShare={() => {}}
        />
      );
    case "ALERT":
      return <AlertCard data={data} onPress={() => onPress(item)} />;
    case "MARKET":
      return (
        <MarketCard
          data={data}
          onPress={() => onPress(item)}
          onShare={onShare ? () => onShare(item) : undefined}
        />
      );
    case "VIDEO_CARD":
      return <VideoPreviewCard data={data} onPress={() => onPress(item)} />;
    default:
      return (
        <TouchableOpacity onPress={() => onPress(item)} style={{ padding: spacing.md }}>
          <Text style={{ color: colors.text }}>{type} — {data?.title ?? ""}</Text>
        </TouchableOpacity>
      );
  }
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const setChats = useChatStore((s) => s.setChats);
  const chats = useChatStore((s) => s.chats);
  const participantProfiles = useChatStore((s) => s.participantProfiles);
  const userId = useAuthStore((s) => s.user?.id ?? s.user?.userId) ?? "";

  const {
    selectedTab,
    setTab,
    homeFeedItems,
    nextCursor,
    liveStreams,
    loading,
    loadingMore,
    refreshing,
    error,
    refresh,
    loadMore,
  } = useHomeStore();

  const [initialLoad, setInitialLoad] = useState(true);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareItem, setShareItem] = useState(null);
  const [shareSelected, setShareSelected] = useState({});
  const [shareSending, setShareSending] = useState(false);

  useEffect(() => {
    refresh().finally(() => setInitialLoad(false));
  }, []);

  const onSelectTab = useCallback(
    (tabId) => {
      setTab(tabId);
      refresh();
    },
    [setTab, refresh]
  );

  const onRefresh = useCallback(() => refresh(), [refresh]);
  const onEndReached = useCallback(() => loadMore(), [loadMore]);

  const handleLivePress = useCallback(
    (stream) => {
      navigation.getParent()?.navigate?.("Live", { screen: "LivePlayer", params: { streamId: stream.streamId, stream } });
    },
    [navigation]
  );

  const handleCardPress = useCallback(
    (item) => {
      const { type, data } = item;
      switch (type) {
        case "JOB":
          navigation.navigate("Jobs", { screen: "JobDetail", params: { jobId: data.id } });
          break;
        case "MARKET":
          navigation.navigate("Marketplace", { screen: "MarketplaceDetail", params: { itemId: data.id } });
          break;
        case "MISSING":
          navigation.navigate("Safety", { screen: "MissingDetail", params: { id: data.id } });
          break;
        case "ALERT":
          navigation.navigate("Safety", { screen: "BlacklistDetail", params: { item: { type: "report", ...data } } });
          break;
        case "VIDEO_CARD":
          navigation.getParent()?.navigate?.("VideoReels", { screen: "VideoDetail", params: { videoId: data.id } });
          break;
        default:
          break;
      }
    },
    [navigation]
  );

  const openShare = useCallback((item) => {
    setShareItem(item);
    setShareSelected({});
    setShareModalVisible(true);
    chatApi.listChats({ limit: 100 }).then((res) => res?.chats?.length && setChats(res.chats)).catch(() => {});
  }, [setChats]);

  const closeShare = useCallback(() => {
    if (!shareSending) {
      setShareModalVisible(false);
      setShareItem(null);
      setShareSelected({});
    }
  }, [shareSending]);

  const toggleShareChat = useCallback((chatId) => {
    setShareSelected((prev) => ({ ...prev, [chatId]: !prev[chatId] }));
  }, []);

  const getShareChatTitle = useCallback((c) => {
    if (c.type === "group") return c.groupName || "Group";
    const otherId = (c.participants || []).find((p) => String(p) !== String(userId));
    if (!otherId) return "Direct chat";
    const profile = participantProfiles[String(otherId)];
    return profile?.displayName ?? `User ${otherId}`;
  }, [userId, participantProfiles]);

  const handleSendShare = useCallback(async () => {
    if (!shareItem) return;
    const selectedIds = Object.keys(shareSelected).filter((id) => shareSelected[id]);
    if (selectedIds.length === 0) {
      Alert.alert("Select chats", "Select at least one chat to share to.");
      return;
    }
    const { type, data } = shareItem;
    const title = data?.title ?? (type === "JOB" ? "Job" : type === "MARKET" ? "Item" : "Post");
    const text = type === "JOB"
      ? `Check out this job: ${title}`
      : type === "MARKET"
        ? `Check out this item: ${title}`
        : `Check this out: ${title}`;
    const token = useAuthStore.getState().token;
    if (token) ensureChatSocket(token);
    setShareSending(true);
    let done = 0;
    let failed = 0;
    const total = selectedIds.length;
    selectedIds.forEach((chatId) => {
      sendChatMessage({ chatId, type: "text", text, mediaUrl: "" }, (ack) => {
        if (ack?.ok) done++;
        else failed++;
        if (done + failed === total) {
          setShareSending(false);
          setShareModalVisible(false);
          setShareItem(null);
          setShareSelected({});
          if (done > 0) Alert.alert("Shared", `Shared to ${done} chat${done !== 1 ? "s" : ""}.${failed > 0 ? ` ${failed} failed.` : ""}`);
          else Alert.alert("Error", "Could not share to any chat.");
        }
      });
    });
  }, [shareItem, shareSelected]);

  const shareChatsSorted = useMemo(() => [...(chats || [])].sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)), [chats]);

  const renderItem = useCallback(
    ({ item }) => <FeedCard item={item} onPress={handleCardPress} onShare={openShare} colors={colors} />,
    [handleCardPress, openShare, colors]
  );

  const keyExtractor = useCallback((item) => `${item.type}-${item.data?.id ?? item.data?.phoneMasked ?? Math.random()}`, []);

  const listHeader = useMemo(
    () => (
      <>
        <LiveHeroCard stream={liveStreams[0]} onPress={handleLivePress} colors={colors} />
        <CategoryChips selectedTab={selectedTab} onSelect={onSelectTab} colors={colors} />
        <ActiveNowRow streams={liveStreams} onPress={handleLivePress} colors={colors} />
      </>
    ),
    [liveStreams, selectedTab, onSelectTab, handleLivePress, colors]
  );

  const listEmpty =
    !loading && !refreshing ? (
      <View style={styles.empty}>
        <MaterialIcons name="feed" size={48} color={colors.textMuted} />
        <Text style={styles.emptyText}>No posts in this tab</Text>
      </View>
    ) : null;

  const listFooter = loadingMore ? (
    <View style={styles.footer}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  ) : null;

  if (initialLoad && !homeFeedItems.length) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <FlatList
        data={homeFeedItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        contentContainerStyle={homeFeedItems.length === 0 ? styles.listEmpty : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        windowSize={8}
        removeClippedSubviews={true}
      />

      <Modal visible={shareModalVisible} transparent animationType="slide" onRequestClose={closeShare}>
        <Pressable style={styles.shareOverlay} onPress={closeShare}>
          <Pressable style={[styles.shareSheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.md }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.shareHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.shareTitle, { color: colors.text }]}>Share to</Text>
            <Text style={[styles.shareSub, { color: colors.textMuted }]}>Select one or more chats</Text>
            <ScrollView style={styles.shareList} keyboardShouldPersistTaps="handled">
              {shareChatsSorted.length === 0 ? (
                <Text style={[styles.shareEmpty, { color: colors.textMuted }]}>No chats yet</Text>
              ) : (
                shareChatsSorted.map((c) => {
                  const cid = c._id || c.id;
                  const title = getShareChatTitle(c);
                  const selected = !!shareSelected[String(cid)];
                  return (
                    <TouchableOpacity
                      key={cid}
                      style={[styles.shareItem, { borderBottomColor: colors.border }]}
                      onPress={() => toggleShareChat(String(cid))}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.shareAvatar, { backgroundColor: colors.surfaceLight }]}>
                        <Text style={[styles.shareAvatarLetter, { color: colors.text }]}>{title.charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text style={[styles.shareItemText, { color: colors.text }]} numberOfLines={1}>{title}</Text>
                      <MaterialIcons name={selected ? "check-circle" : "radio-button-unchecked"} size={26} color={selected ? colors.primary : colors.textMuted} />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <View style={styles.shareActions}>
              <TouchableOpacity style={styles.shareCancelBtn} onPress={closeShare} disabled={shareSending}>
                <Text style={[styles.shareCancelText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shareSendBtn, { backgroundColor: colors.primary }]}
                onPress={handleSendShare}
                disabled={shareSending || Object.values(shareSelected).every((v) => !v)}
              >
                {shareSending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.shareSendText}>Share</Text>
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
    listContent: { paddingBottom: spacing.xxl },
    listEmpty: { flexGrow: 1, paddingBottom: spacing.xxl },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    empty: { padding: spacing.xl, alignItems: "center" },
    emptyText: { fontSize: 16, color: colors.textMuted, marginTop: spacing.sm },
    footer: { padding: spacing.md, alignItems: "center" },
    errorWrap: { padding: spacing.md, alignItems: "center" },
    errorText: { fontSize: 14, color: colors.error, marginBottom: spacing.sm },
    retryText: { fontSize: 15, fontWeight: "600", color: colors.primary },
    shareOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
    shareSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: spacing.sm, paddingHorizontal: spacing.md, maxHeight: "80%" },
    shareHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: spacing.md },
    shareTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
    shareSub: { fontSize: 13, marginBottom: spacing.md },
    shareList: { maxHeight: 320, marginBottom: spacing.md },
    shareEmpty: { paddingVertical: spacing.lg, textAlign: "center" },
    shareItem: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, gap: spacing.sm, borderBottomWidth: 1 },
    shareAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
    shareAvatarLetter: { fontSize: 18, fontWeight: "700" },
    shareItemText: { flex: 1, fontSize: 16, fontWeight: "600" },
    shareActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: spacing.md },
    shareCancelBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
    shareCancelText: { fontSize: 16 },
    shareSendBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: 12, minWidth: 100, alignItems: "center" },
    shareSendText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  });
}
