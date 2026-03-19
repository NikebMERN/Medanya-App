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
} from "react-native";
import { useToastStore } from "../../store/toast.store";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
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
import MarketplaceFeedCard from "../../components/marketplace/MarketplaceFeedCard";
import VideoPreviewCard from "../../components/feed/VideoPreviewCard";
import VideoReelCard from "../../components/feed/VideoReelCard";
import MissingReelCard from "../../components/feed/MissingReelCard";
import GalleryBannerCard from "../../components/feed/GalleryBannerCard";
import MarketplaceReelCard from "../../components/marketplace/MarketplaceReelCard";
import InlineErrorBanner from "../../components/ui/InlineErrorBanner";
import * as chatApi from "../../services/chat.api";
import { ensureChatSocket, sendChatMessage } from "../../realtime/chat.socket";
import * as livestreamApi from "../../api/livestream.api";

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
          {tab.icon ? <MaterialIcons name={tab.icon} size={16} color={selectedTab === tab.id ? colors.primary : colors.textMuted} style={styles.chipIcon} /> : null}
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
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      minHeight: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: spacing.sm,
    },
    chipIcon: { marginRight: 6 },
    chipActive: { backgroundColor: colors.primary + "25", borderColor: colors.primary },
    chipText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
    chipTextActive: { color: colors.primary },
  });
}

function LiveFollowingRow({ streams, onPress, onExploreCreators, onViewAll, isLoggedIn, colors }) {
  const styles = useMemo(() => liveRowStyles(colors), [colors]);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>((o)) LIVE COMMUNITY STREAMS</Text>
        {streams?.length ? (
          <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.viewAll, { color: colors.primary }]}>VIEW ALL</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {streams?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {streams.slice(0, 10).map((s) => (
            <TouchableOpacity key={s.streamId} style={styles.avatarWrap} onPress={() => onPress(s)} activeOpacity={0.8}>
              <View style={styles.avatarContainer}>
                <View style={[styles.avatar, { borderColor: colors.primary }]}>
                  <MaterialIcons name="videocam" size={20} color={colors.primary} />
                </View>
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              </View>
              <Text style={styles.name} numberOfLines={1}>{s.title || "Live"}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyCard}>
          <MaterialIcons name="videocam-off" size={28} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            {isLoggedIn ? "No one you follow is live right now" : "Sign in to see live streams from people you follow"}
          </Text>
          {isLoggedIn && (
            <TouchableOpacity style={[styles.exploreBtn, { backgroundColor: colors.primary }]} onPress={onExploreCreators} activeOpacity={0.8}>
              <Text style={styles.exploreBtnText}>Find people to follow</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function liveRowStyles(colors) {
  return StyleSheet.create({
    section: { marginBottom: spacing.md },
    sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginLeft: spacing.md, marginRight: spacing.md, marginBottom: spacing.xs },
    sectionTitle: { fontSize: 12, fontWeight: "800", color: colors.textMuted, letterSpacing: 0.5 },
    viewAll: { fontSize: 12, fontWeight: "700" },
    row: { paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
    avatarWrap: { alignItems: "center", marginRight: spacing.md },
    avatarContainer: { position: "relative" },
    avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surface, borderWidth: 2, justifyContent: "center", alignItems: "center" },
    liveBadge: {
      position: "absolute",
      bottom: -4,
      left: "50%",
      marginLeft: -18,
      backgroundColor: colors.error || "#e53935",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    liveBadgeText: { fontSize: 9, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
    name: { fontSize: 11, fontWeight: "600", color: colors.text, marginTop: 8, maxWidth: 56, textAlign: "center" },
    emptyCard: {
      marginHorizontal: spacing.md,
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    emptyText: { fontSize: 14, color: colors.textMuted, marginTop: spacing.sm, textAlign: "center" },
    exploreBtn: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 20 },
    exploreBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  });
}

/** On Feeds tab: only jobs in main vertical list; videos/market/missing/gallery in separate horizontal rows. */
const FEED_CARD_TYPES_MAIN = ["JOB"];
const FEED_CARD_TYPES = ["JOB", "MISSING", "MARKET"];
const GALLERY_TYPES = ["GALLERY_CARD", "IMAGE_POST"];

function FeedCard({ item, onPress, onShare, colors, hideAlerts }) {
  const { type, data } = item;
  if (hideAlerts && type === "ALERT") return null;

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
          onShare={onShare ? () => onShare(item) : undefined}
        />
      );
    case "ALERT":
      return <AlertCard data={data} onPress={() => onPress(item)} onShare={onShare ? () => onShare(item) : undefined} />;
    case "MARKET":
      return (
        <MarketplaceFeedCard
          data={data}
          onPress={() => onPress(item)}
          onShare={onShare ? () => onShare(item) : undefined}
        />
      );
    case "VIDEO_CARD":
      return <VideoPreviewCard data={data} onPress={() => onPress(item)} onShare={onShare ? () => onShare(item) : undefined} />;
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
    clearError,
  } = useHomeStore();

  const [initialLoad, setInitialLoad] = useState(true);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareItem, setShareItem] = useState(null);
  const [shareSelected, setShareSelected] = useState({});
  const [shareSending, setShareSending] = useState(false);
  const [myActiveStream, setMyActiveStream] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      livestreamApi.getMyActiveStream().then((s) => {
        if (!cancelled) setMyActiveStream(s || null);
      }).catch(() => {
        if (!cancelled) setMyActiveStream(null);
      });
      return () => { cancelled = true; };
    }, [])
  );

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
      const sid = stream.streamId ?? stream._id;
      navigation.getParent()?.navigate?.("Live", { screen: "LivePlayer", params: { streamId: sid, stream } });
    },
    [navigation]
  );

  const handleReturnToLive = useCallback(() => {
    if (!myActiveStream) return;
    const sid = myActiveStream._id ?? myActiveStream.streamId;
    navigation.getParent()?.navigate?.("Live", { screen: "LiveHost", params: { streamId: sid, stream: myActiveStream } });
  }, [myActiveStream, navigation]);

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
        case "GALLERY_CARD":
        case "IMAGE_POST":
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
      useToastStore.getState().showToast({ type: "info", message: "Select at least one chat to share to." });
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
          if (done > 0) useToastStore.getState().success(`Shared to ${done} chat${done !== 1 ? "s" : ""}.${failed > 0 ? ` ${failed} failed.` : ""}`);
          else useToastStore.getState().error("Could not share to any chat.");
        }
      });
    });
  }, [shareItem, shareSelected]);

  const shareChatsSorted = useMemo(() => [...(chats || [])].sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)), [chats]);

  const { feedItems, videoItems, marketItems, missingItems, galleryItems } = useMemo(() => {
    if (selectedTab !== "feeds") {
      return {
        feedItems: homeFeedItems,
        videoItems: [],
        marketItems: [],
        missingItems: [],
        galleryItems: [],
      };
    }
    const videos = homeFeedItems.filter((i) => i.type === "VIDEO_CARD");
    const market = homeFeedItems.filter((i) => i.type === "MARKET");
    const missing = homeFeedItems.filter((i) => i.type === "MISSING");
    const gallery = homeFeedItems.filter((i) => GALLERY_TYPES.includes(i.type));
    const mainList = homeFeedItems.filter((i) => FEED_CARD_TYPES_MAIN.includes(i.type));
    return {
      feedItems: mainList,
      videoItems: videos,
      marketItems: market,
      missingItems: missing,
      galleryItems: gallery,
    };
  }, [homeFeedItems, selectedTab]);

  const renderItem = useCallback(
    ({ item }) => (
      <FeedCard
        item={item}
        onPress={handleCardPress}
        onShare={openShare}
        colors={colors}
        hideAlerts={selectedTab === "feeds"}
      />
    ),
    [handleCardPress, openShare, colors, selectedTab]
  );

  const keyExtractor = useCallback((item) => `${item.type}-${item.data?.id ?? item.data?.phoneMasked ?? Math.random()}`, []);

  const VideosHorizontalRow = useMemo(() => {
    if (selectedTab !== "feeds" || !videoItems?.length) return null;
    return (
      <View style={styles.videosSection}>
        <Text style={[styles.videosSectionTitle, { color: colors.textMuted }]}>VIDEOS FOR YOU</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.videosRow}
        >
          {videoItems.map((item) => (
            <VideoReelCard
              key={`video-${item.data?.id}`}
              data={item.data}
              onPress={() => handleCardPress(item)}
            />
          ))}
        </ScrollView>
      </View>
    );
  }, [selectedTab, videoItems, colors, handleCardPress, styles]);

  const MarketplaceHorizontalRow = useMemo(() => {
    if (selectedTab !== "feeds" || !marketItems?.length) return null;
    return (
      <View style={styles.videosSection}>
        <Text style={[styles.videosSectionTitle, { color: colors.textMuted }]}>MARKETPLACE</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.videosRow}
        >
          {marketItems.map((item) => (
            <MarketplaceReelCard
              key={`market-${item.data?.id}`}
              data={item.data}
              onPress={() => handleCardPress(item)}
            />
          ))}
        </ScrollView>
      </View>
    );
  }, [selectedTab, marketItems, colors, handleCardPress, styles]);

  const MissingHorizontalRow = useMemo(() => {
    if (selectedTab !== "feeds" || !missingItems?.length) return null;
    return (
      <View style={styles.videosSection}>
        <Text style={[styles.videosSectionTitle, { color: colors.textMuted }]}>MISSING PERSONS</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.videosRow}
        >
          {missingItems.map((item) => (
            <MissingReelCard
              key={`missing-${item.data?.id}`}
              data={item.data}
              onPress={() => handleCardPress(item)}
            />
          ))}
        </ScrollView>
      </View>
    );
  }, [selectedTab, missingItems, colors, handleCardPress, styles]);

  const GalleryBannerRow = useMemo(() => {
    if (selectedTab !== "feeds" || !galleryItems?.length) return null;
    return (
      <View style={styles.videosSection}>
        <Text style={[styles.videosSectionTitle, { color: colors.textMuted }]}>GALLERY</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.videosRow}
        >
          {galleryItems.map((item) => (
            <GalleryBannerCard
              key={`gallery-${item.data?.id}`}
              data={item.data}
              onPress={() => handleCardPress(item)}
              onShare={openShare ? () => openShare(item) : undefined}
            />
          ))}
        </ScrollView>
      </View>
    );
  }, [selectedTab, galleryItems, colors, handleCardPress, openShare, styles]);

  const listHeader = useMemo(
    () => (
      <>
        {error ? (
          <InlineErrorBanner
            message={error}
            onRetry={refresh}
            onDismiss={clearError}
          />
        ) : null}
        {myActiveStream && (
          <TouchableOpacity
            style={[styles.returnToLiveBanner, { backgroundColor: colors.primary + "20", borderColor: colors.primary }]}
            onPress={handleReturnToLive}
            activeOpacity={0.8}
          >
            <View style={styles.returnToLiveRow}>
              <View style={[styles.returnToLiveDot, { backgroundColor: colors.error || "#e53935" }]} />
              <Text style={[styles.returnToLiveText, { color: colors.primary }]}>Your stream is still live</Text>
            </View>
            <Text style={[styles.returnToLiveSub, { color: colors.textMuted }]}>Tap to return to your live stream</Text>
            <MaterialIcons name="videocam" size={20} color={colors.primary} style={styles.returnToLiveIcon} />
          </TouchableOpacity>
        )}
        {selectedTab === "feeds" && liveStreams?.[0] ? <LiveHeroCard stream={liveStreams[0]} onPress={handleLivePress} colors={colors} /> : null}
        <CategoryChips selectedTab={selectedTab} onSelect={onSelectTab} colors={colors} />
        {selectedTab === "feeds" && (
          <LiveFollowingRow
            streams={liveStreams?.filter((s) => String(s?.hostId) !== String(userId)) ?? []}
            onPress={handleLivePress}
            onViewAll={() => navigation.getParent()?.navigate?.("Live")}
            onExploreCreators={() => navigation.getParent()?.navigate?.("Profile")}
            isLoggedIn={!!userId}
            colors={colors}
          />
        )}
        {GalleryBannerRow}
        {VideosHorizontalRow}
        {MarketplaceHorizontalRow}
        {MissingHorizontalRow}
      </>
    ),
    [error, refresh, clearError, myActiveStream, liveStreams, userId, selectedTab, onSelectTab, handleLivePress, handleReturnToLive, GalleryBannerRow, VideosHorizontalRow, MarketplaceHorizontalRow, MissingHorizontalRow, colors]
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

  const hasAnyFeedContent =
    feedItems.length > 0 ||
    videoItems.length > 0 ||
    marketItems.length > 0 ||
    missingItems.length > 0 ||
    galleryItems.length > 0;
  if (initialLoad && !hasAnyFeedContent) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={feedItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        contentContainerStyle={feedItems.length === 0 ? styles.listEmpty : styles.listContent}
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
    returnToLiveBanner: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
    },
    returnToLiveRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    returnToLiveDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    returnToLiveText: { fontSize: 15, fontWeight: "700" },
    returnToLiveSub: { fontSize: 13 },
    returnToLiveIcon: { position: "absolute", right: spacing.md, top: spacing.md },
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
    videosSection: { marginBottom: spacing.md },
    videosSectionTitle: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5, marginLeft: spacing.md, marginBottom: spacing.sm },
    videosRow: { paddingHorizontal: spacing.md, paddingRight: spacing.lg },
  });
}
