/**
 * InsightsScreen — Profile tab: "Great job – you had X views", chart, range/metrics toggles.
 */
import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import SubScreenHeader from "../../components/SubScreenHeader";
import { useThemeColors } from "../../theme/useThemeColors";
import { radii, layout } from "../../theme/designSystem";
import { spacing } from "../../theme/spacing";
import { useAnalyticsStore } from "../../modules/analytics/analytics.store";
import { useAuthStore } from "../../store/auth.store";
import InsightsAreaChart from "../../components/analytics/InsightsAreaChart";

const RANGE_OPTIONS = [7, 28, 90];
const METRICS_OPTIONS = [
  { key: "views", label: "Views", icon: "visibility" },
  { key: "likes", label: "Likes", icon: "favorite" },
  { key: "comments", label: "Comments", icon: "comment" },
  { key: "follows", label: "Followers", icon: "people" },
  { key: "sales", label: "Sales", icon: "shopping-cart" },
  { key: "gifts", label: "Gifts", icon: "card-giftcard" },
];

export default function InsightsScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const userId = useAuthStore((s) => s.user)?.id ?? useAuthStore((s) => s.user)?.userId;

  const {
    data,
    loading,
    error,
    range,
    metricsKey,
    setRange,
    setMetricsKey,
    fetchUserAnalytics,
    reset,
  } = useAnalyticsStore();

  const load = useCallback(() => {
    if (!userId) return;
    return fetchUserAnalytics(userId, range);
  }, [userId, range, fetchUserAnalytics]);

  const isFocused = useIsFocused();

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isFocused || !userId) return;
    const id = setInterval(() => load(), 30000);
    return () => clearInterval(id);
  }, [isFocused, userId, load]);

  const onRefresh = useCallback(async () => {
    await load();
  }, [load]);

  const summary = data?.summary ?? {};
  const series = data?.series ?? [];
  const totalViews = summary.totalViews ?? 0;
  const percentChange = summary.percentChangeViews ?? 0;

  const getMetricTotal = () => {
    switch (metricsKey) {
      case "views": return totalViews;
      case "likes": return summary.totalLikes ?? 0;
      case "comments": return summary.totalComments ?? 0;
      case "follows": return summary.totalFollows ?? 0;
      case "sales": return summary.totalMarketSalesUSD ?? 0;
      case "gifts": return summary.totalGiftsCoins ?? 0;
      default: return totalViews;
    }
  };

  const tabNav = navigation?.getParent?.() ?? navigation;

  if (!userId) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <SubScreenHeader title="Insights" onBack={() => navigation.goBack()} showProfileDropdown navigation={tabNav} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Sign in to view your insights</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SubScreenHeader title="Insights" onBack={() => navigation.goBack()} showProfileDropdown navigation={tabNav} />

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.card}>
          {loading && !data ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <>
              <Text style={styles.title}>Great job – you had {getMetricTotal().toLocaleString()} {metricsKey}</Text>
              <Text style={[styles.subtitle, percentChange >= 0 ? styles.subtitleUp : styles.subtitleDown]}>
                {percentChange >= 0 ? "↑" : "↓"}{Math.abs(percentChange)}% from previous period
              </Text>

              <View style={styles.rangeRow}>
                {RANGE_OPTIONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
                    onPress={() => setRange(r)}
                  >
                    <Text style={[styles.rangeText, range === r && styles.rangeTextActive]}>{r} days</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.metricsRow}>
                {METRICS_OPTIONS.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.metricChip, metricsKey === m.key && styles.metricChipActive]}
                    onPress={() => setMetricsKey(m.key)}
                  >
                    <MaterialIcons
                      name={m.icon}
                      size={18}
                      color={metricsKey === m.key ? colors.white : colors.textMuted}
                    />
                    <Text style={[styles.metricLabel, metricsKey === m.key && styles.metricLabelActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <InsightsAreaChart data={series} seriesKey={metricsKey} loading={loading && !data} />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: layout.screenPadding,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginLeft: spacing.md },
    scroll: { flex: 1 },
    scrollContent: { padding: layout.screenPadding, paddingBottom: spacing.xxl },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.card,
      padding: layout.cardPadding,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: { fontSize: 18, fontWeight: "800", color: colors.text },
    subtitle: { fontSize: 14, marginTop: 4 },
    subtitleUp: { color: colors.success },
    subtitleDown: { color: colors.error },
    rangeRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
    rangeBtn: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.input,
      backgroundColor: colors.surfaceLight,
    },
    rangeBtnActive: { backgroundColor: colors.primary },
    rangeText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
    rangeTextActive: { color: colors.white },
    metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
    metricChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.pill,
      backgroundColor: colors.surfaceLight,
    },
    metricChipActive: { backgroundColor: colors.primary },
    metricLabel: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
    metricLabelActive: { color: colors.white },
    loadingBox: { minHeight: 200, justifyContent: "center", alignItems: "center" },
    errorBanner: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.error + "20",
      padding: spacing.md,
      marginHorizontal: layout.screenPadding,
      marginBottom: spacing.md,
      borderRadius: radii.input,
    },
    errorText: { fontSize: 14, color: colors.error, flex: 1 },
    retryText: { fontSize: 14, fontWeight: "700", color: colors.primary },
    empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
    emptyText: { fontSize: 16, color: colors.textMuted },
  });
}
