import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { MaterialIcons } from "@expo/vector-icons";
import { useLivestreamStore } from "../../store/livestream.store";

export default function LiveListScreen({ navigation }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { streams, loading, loadingMore, error, refresh, loadMore } = useLivestreamStore();
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
      onPress={() => navigation?.navigate?.("LivePlayer", { streamId: item._id, stream: item })}
    >
      <View style={styles.cardIcon}>
        <MaterialIcons name="videocam" size={32} color={colors.primary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title || "Live stream"}</Text>
        <Text style={styles.cardMeta}>
          {item.viewerCount ?? 0} watching · {item.category || "Live"}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
    </TouchableOpacity>
  );

  if (loading && (!streams || streams.length === 0)) {
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
        data={streams}
        keyExtractor={(item) => String(item._id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>No live streams</Text>
            <Text style={styles.emptySub}>Be the first to go live.</Text>
            <TouchableOpacity
              style={styles.goLiveBtn}
              onPress={() => navigation?.navigate?.("LiveHostSetup")}
            >
              <Text style={styles.goLiveBtnText}>Go live</Text>
            </TouchableOpacity>
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
    listContent: { padding: spacing.md, paddingBottom: spacing.xxl },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg },
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary + "20",
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.md,
    },
    cardBody: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
    cardMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
    emptySub: { color: colors.textSecondary, marginTop: spacing.xs, textAlign: "center" },
    goLiveBtn: { marginTop: spacing.md, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: colors.primary },
    goLiveBtnText: { color: colors.white, fontWeight: "700" },
    footer: { paddingVertical: spacing.md },
    errorBox: { padding: spacing.md, backgroundColor: (colors.error || "#e53935") + "20", borderBottomWidth: 1, borderBottomColor: (colors.error || "#e53935") + "40" },
    errorText: { color: colors.error || "#e53935", fontWeight: "700" },
    retryBtn: { marginTop: spacing.sm, alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.primary },
    retryText: { color: colors.white, fontWeight: "800" },
  });
}
