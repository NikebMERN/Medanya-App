import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useJobsStore, JOB_CATEGORIES } from "../../store/jobs.store";
import * as jobsApi from "../../services/jobs.api";

export default function JobsListScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const jobs = useJobsStore((s) => s.jobs);
  const total = useJobsStore((s) => s.total);
  const loading = useJobsStore((s) => s.loading);
  const error = useJobsStore((s) => s.error);
  const category = useJobsStore((s) => s.category);
  const keyword = useJobsStore((s) => s.keyword);
  const setJobs = useJobsStore((s) => s.setJobs);
  const setLoading = useJobsStore((s) => s.setLoading);
  const setError = useJobsStore((s) => s.setError);
  const setFilters = useJobsStore((s) => s.setFilters);
  const clear = useJobsStore((s) => s.clear);

  const [searchInput, setSearchInput] = useState(keyword);
  const [refreshing, setRefreshing] = useState(false);

  const loadJobs = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: 1,
        limit: 30,
        category: category || undefined,
        location: searchInput.trim() || undefined,
        keyword: searchInput.trim() || undefined,
      };
      const result = searchInput.trim()
        ? await jobsApi.searchJobs(params)
        : await jobsApi.listJobs(params);
      setJobs(result.jobs, result.total, result.page);
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || "Failed to load jobs.";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, searchInput, setJobs, setLoading, setError]);

  useEffect(() => {
    loadJobs();
  }, [category]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadJobs(true);
  }, [loadJobs]);

  const onSearch = useCallback(() => {
    setFilters({ keyword: searchInput.trim() });
    loadJobs(true);
  }, [searchInput, setFilters, loadJobs]);

  const onCategoryPress = useCallback((value) => {
    setFilters({ category: value });
  }, [setFilters]);

  const renderItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("JobDetail", { jobId: item.id })}
        activeOpacity={0.8}
      >
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <MaterialIcons name="work" size={32} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardCategory}>{item.category || "Job"}</Text>
            {item.salary ? (
              <Text style={styles.cardSalary} numberOfLines={1}>{item.salary}</Text>
            ) : null}
          </View>
          {item.location ? (
            <View style={styles.cardLocation}>
              <MaterialIcons name="location-on" size={14} color={colors.textMuted} />
              <Text style={styles.cardLocationText} numberOfLines={1}>{item.location}</Text>
            </View>
          ) : null}
          <View style={styles.cardFooter}>
            <Text style={styles.cardApply}>Apply</Text>
            <MaterialIcons name="arrow-forward" size={16} color={colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    ),
    [navigation, styles, colors]
  );

  const listHeader = (
    <>
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <MaterialIcons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search roles or locations"
            placeholderTextColor={colors.textMuted}
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={onSearch}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={onSearch} activeOpacity={0.8}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.filterRow}>
        {JOB_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.value || "all"}
            style={[styles.filterChip, (!category && !cat.value) || category === cat.value ? styles.filterChipActive : null]}
            onPress={() => onCategoryPress(cat.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, (!category && !cat.value) || category === cat.value ? styles.filterChipTextActive : null]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.resultCount}>
        {total} {total === 1 ? "opportunity" : "opportunities"} found
      </Text>
    </>
  );

  const listEmpty = loading ? null : (
    <View style={styles.empty}>
      <MaterialIcons name="work-off" size={48} color={colors.textMuted} />
      <Text style={styles.emptyText}>No jobs match your search</Text>
      <Text style={styles.emptySubtext}>Try different filters or search terms</Text>
    </View>
  );

  const listError = error ? (
    <View style={styles.errorWrap}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => loadJobs(true)}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      {listHeader}
      {listError}
      {loading && jobs.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={jobs.length === 0 ? styles.listEmpty : styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={6}
          removeClippedSubviews={Platform.OS !== "web"}
        />
      )}
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    searchWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    searchInput: {
      flex: 1,
      paddingVertical: spacing.sm,
      fontSize: 15,
      color: colors.text,
    },
    searchBtn: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    searchBtnText: { color: colors.white, fontWeight: "600", fontSize: 14 },
    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.xs,
    },
    filterChip: {
      paddingVertical: 6,
      paddingHorizontal: spacing.md,
      borderRadius: 20,
      backgroundColor: colors.surfaceLight,
    },
    filterChipActive: { backgroundColor: colors.primary },
    filterChipText: { fontSize: 13, color: colors.text },
    filterChipTextActive: { fontSize: 13, color: colors.white, fontWeight: "600" },
    resultCount: {
      fontSize: 13,
      color: colors.textMuted,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    listContent: { padding: spacing.md, paddingTop: 0 },
    listEmpty: { flexGrow: 1 },
    card: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: spacing.md,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardImage: { width: 90, height: 90 },
    cardImagePlaceholder: {
      backgroundColor: colors.surfaceLight,
      justifyContent: "center",
      alignItems: "center",
    },
    cardBody: { flex: 1, padding: spacing.md, justifyContent: "space-between" },
    cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 },
    cardMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 4 },
    cardCategory: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    cardSalary: { fontSize: 12, color: colors.textSecondary },
    cardLocation: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginBottom: 4,
    },
    cardLocationText: { fontSize: 12, color: colors.textMuted, flex: 1 },
    cardFooter: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 4,
    },
    cardApply: { fontSize: 14, fontWeight: "600", color: colors.primary },
    empty: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.xl,
    },
    emptyText: { fontSize: 16, color: colors.text, fontWeight: "600", marginTop: spacing.md },
    emptySubtext: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
    errorWrap: {
      padding: spacing.lg,
      alignItems: "center",
    },
    errorText: { fontSize: 14, color: colors.error, textAlign: "center", marginBottom: spacing.sm },
    retryBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
    retryText: { fontSize: 15, fontWeight: "600", color: colors.primary },
    loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  });
}
