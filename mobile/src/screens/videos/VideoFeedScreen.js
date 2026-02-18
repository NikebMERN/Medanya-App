import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { MaterialIcons } from "@expo/vector-icons";
import { useVideosStore } from "../../store/videos.store";

export default function VideoFeedScreen({ navigation }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { videos, loading, loadingMore, error, refresh, loadMore, optimisticToggleLike } = useVideosStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation?.navigate?.("VideoDetail", { videoId: item._id })}
    >
      <View style={styles.row}>
        <Text style={styles.caption} numberOfLines={2}>{item.caption || "Untitled video"}</Text>
      </View>
      <View style={styles.metaRow}>
        <TouchableOpacity
          style={styles.likeBtn}
          onPress={() => optimisticToggleLike(item._id, !(item._optimisticLiked ?? false))}
        >
          <MaterialIcons name="favorite" size={18} color={(item._optimisticLiked ?? false) ? colors.error : colors.textMuted} />
          <Text style={styles.metaText}>{item.likeCount ?? 0}</Text>
        </TouchableOpacity>
        <View style={styles.likeBtn}>
          <MaterialIcons name="chat-bubble-outline" size={18} color={colors.textMuted} />
          <Text style={styles.metaText}>{item.commentCount ?? 0}</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{String(item.status || "").toUpperCase()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && (!videos || videos.length === 0)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refresh} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={videos}
        keyExtractor={(item) => String(item._id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>No videos yet</Text>
            <Text style={styles.emptySub}>Upload a short video to get started.</Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    caption: { flex: 1, color: colors.text, fontSize: 15, fontWeight: "700" },
    metaRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm, gap: spacing.md },
    likeBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
    metaText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
    statusPill: { marginLeft: "auto", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.surfaceLight },
    statusText: { color: colors.textMuted, fontSize: 10, fontWeight: "800" },
    footer: { paddingVertical: spacing.md },
    errorBox: { padding: spacing.md, backgroundColor: colors.error + "20", borderBottomWidth: 1, borderBottomColor: colors.error + "40" },
    errorText: { color: colors.error, fontWeight: "700" },
    retryBtn: { marginTop: spacing.sm, alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.primary },
    retryText: { color: colors.white, fontWeight: "800" },
    emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
    emptySub: { color: colors.textSecondary, marginTop: spacing.xs, textAlign: "center" },
  });
}
