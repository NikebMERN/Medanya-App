import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import * as feedApi from "../../services/feed.api";

function FeedCard({ item, onPress, colors }) {
  const styles = useMemo(() => cardStyles(colors), [colors]);
  const typeLabel = item.type === "job" ? "Job" : item.type === "marketplace" ? "Marketplace" : item.type === "missing_person" ? "Missing Person" : item.type === "report" ? "Scam Alert" : "";
  const typeColor = item.type === "report" ? (item.preview?.riskLevel === "dangerous" ? colors.error : colors.warning) : colors.primary;
  const imageUri = item.preview?.imageUrl || item.preview?.photoUrl || item.preview?.image_url;
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.8}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <MaterialIcons
            name={item.type === "job" ? "work" : item.type === "marketplace" ? "storefront" : item.type === "missing_person" ? "person-search" : "warning"}
            size={36}
            color={colors.textMuted}
          />
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.typeRow}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + "30" }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>{typeLabel}</Text>
          </View>
        </View>
        <Text style={styles.title} numberOfLines={1}>{item.title || "—"}</Text>
        {item.summary ? <Text style={styles.summary} numberOfLines={2}>{item.summary}</Text> : null}
        {item.location ? (
          <View style={styles.location}>
            <MaterialIcons name="location-on" size={12} color={colors.textMuted} />
            <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
          </View>
        ) : null}
      </View>
      <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function cardStyles(colors) {
  return StyleSheet.create({
    card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 12, marginBottom: spacing.sm, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
    image: { width: 72, height: 72 },
    imagePlaceholder: { width: 72, height: 72, backgroundColor: colors.surfaceLight, justifyContent: "center", alignItems: "center" },
    body: { flex: 1, padding: spacing.md },
    typeRow: { flexDirection: "row", marginBottom: 4 },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start" },
    typeText: { fontSize: 11, fontWeight: "700" },
    title: { fontSize: 15, fontWeight: "600", color: colors.text },
    summary: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    location: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    locationText: { fontSize: 12, color: colors.textMuted, flex: 1 },
  });
}

export default function FeedScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const loadFeed = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
      setNextCursor(null);
    } else if (nextCursor && !refresh) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await feedApi.getFeed({
        cursor: refresh ? null : nextCursor,
        limit: 20,
        types: "job,report,missing_person,marketplace",
      });
      const newItems = res.items ?? [];
      if (refresh || !nextCursor) {
        setItems(newItems);
      } else {
        setItems((prev) => [...prev, ...newItems]);
      }
      setNextCursor(res.nextCursor ?? null);
    } catch (err) {
      setError(err?.message || "Failed to load feed.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [nextCursor]);

  useEffect(() => {
    loadFeed(true);
  }, []);

  const onRefresh = useCallback(() => loadFeed(true), [loadFeed]);

  const onEndReached = useCallback(() => {
    if (nextCursor && !loadingMore && !loading) loadFeed(false);
  }, [nextCursor, loadingMore, loading, loadFeed]);

  const handleItemPress = useCallback(
    (item) => {
      switch (item.type) {
        case "job":
          navigation.navigate("Jobs", { screen: "JobDetail", params: { jobId: item.id } });
          break;
        case "marketplace":
          navigation.navigate("Marketplace", { screen: "MarketplaceDetail", params: { itemId: item.id } });
          break;
        case "missing_person":
          navigation.navigate("Safety", { screen: "MissingDetail", params: { id: item.id } });
          break;
        case "report":
          navigation.navigate("Safety", { screen: "BlacklistDetail", params: { item } });
          break;
        default:
          break;
      }
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }) => <FeedCard item={item} onPress={handleItemPress} colors={colors} />,
    [handleItemPress, colors]
  );

  const listEmpty = loading ? null : (
    <View style={styles.empty}>
      <MaterialIcons name="feed" size={48} color={colors.textMuted} />
      <Text style={styles.emptyText}>No posts yet</Text>
      <Text style={styles.emptySubtext}>Community feed will show jobs, alerts, and more</Text>
    </View>
  );

  const listFooter = loadingMore ? (
    <View style={styles.footer}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadFeed(true)}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      ) : null}
      {loading && items.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => `${it.type}-${it.id}`}
          renderItem={renderItem}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          contentContainerStyle={items.length === 0 ? styles.listEmpty : styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
        />
      )}
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { padding: spacing.md, paddingBottom: spacing.xl },
    listEmpty: { flexGrow: 1 },
    empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
    emptyText: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: spacing.md },
    emptySubtext: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
    errorWrap: { padding: spacing.md, alignItems: "center" },
    errorText: { fontSize: 14, color: colors.error, marginBottom: spacing.sm },
    retryText: { fontSize: 15, fontWeight: "600", color: colors.primary },
    loader: { flex: 1, justifyContent: "center", alignItems: "center" },
    footer: { padding: spacing.md, alignItems: "center" },
  });
}
