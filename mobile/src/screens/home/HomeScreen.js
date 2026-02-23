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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useHomeStore, TABS } from "../../store/home.store";
import JobCard from "../../components/feed/JobCard";
import MissingCard from "../../components/feed/MissingCard";
import AlertCard from "../../components/feed/AlertCard";
import MarketCard from "../../components/feed/MarketCard";
import VideoPreviewCard from "../../components/feed/VideoPreviewCard";

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

function FeedCard({ item, onPress, colors }) {
  const { type, data } = item;

  switch (type) {
    case "JOB":
      return (
        <JobCard
          data={data}
          onPress={() => onPress(item)}
          onChat={() => onPress(item)}
          onApply={() => onPress(item)}
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
      return <MarketCard data={data} onPress={() => onPress(item)} />;
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  const renderItem = useCallback(
    ({ item }) => <FeedCard item={item} onPress={handleCardPress} colors={colors} />,
    [handleCardPress, colors]
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
  });
}
