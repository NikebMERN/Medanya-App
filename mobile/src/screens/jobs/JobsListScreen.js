import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  Platform,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useJobsStore, JOB_CATEGORIES } from "../../store/jobs.store";
import { useAuthStore } from "../../store/auth.store";
import { canPostJobs, getDobFromUser } from "../../utils/age";
import StatusChip from "../../components/StatusChip";
import RiskBadge from "../../components/RiskBadge";
import SkeletonCard from "../../components/SkeletonCard";
import EmptyState from "../../components/EmptyState";
import { normalizePlaceholder } from "../../components/ui/Input";
import { inputStyleAndroid } from "../../theme/inputStyles";
import { webModalOverlay, webModalContent } from "../../theme/webLayout";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "salary_high", label: "Salary: High to Low" },
];

export default function JobsListScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const userId = useAuthStore((s) => s.user?.id ?? s.user?.userId ?? "");
  const user = useAuthStore((s) => s.user);
  const otpVerified = !!(user?.otp_verified ?? user?.otpVerified);
  const kycFaceVerified = !!(user?.kyc_face_verified ?? user?.kycFaceVerified);
  const canPost = canPostJobs(getDobFromUser(user));
  const isLoggedIn = !!useAuthStore((s) => s.token);

  const jobs = useJobsStore((s) => s.jobs);
  const total = useJobsStore((s) => s.total);
  const loading = useJobsStore((s) => s.loading);
  const error = useJobsStore((s) => s.error);
  const refreshing = useJobsStore((s) => s.refreshing);
  const hasMore = useJobsStore((s) => s.hasMore);
  const category = useJobsStore((s) => s.category);
  const keyword = useJobsStore((s) => s.keyword);
  const sort = useJobsStore((s) => s.sort);
  const setFilters = useJobsStore((s) => s.setFilters);
  const setViewerId = useJobsStore((s) => s.setViewerId);
  const fetchJobs = useJobsStore((s) => s.fetchJobs);
  const fetchMore = useJobsStore((s) => s.fetchMore);
  const refresh = useJobsStore((s) => s.refresh);

  useEffect(() => {
    setViewerId(userId);
  }, [userId, setViewerId]);

  const [searchInput, setSearchInput] = useState(keyword || "");
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);
  const [sortDropdownVisible, setSortDropdownVisible] = useState(false);
  const isFirstFocus = useRef(true);

  const selectedCategoryLabel = useMemo(() => {
    const cat = JOB_CATEGORIES.find((c) => (c.value || "") === (category || ""));
    return cat?.label ?? "All categories";
  }, [category]);

  const selectedSortLabel = useMemo(() => {
    const opt = SORT_OPTIONS.find((o) => (o.value || "") === (sort || "newest"));
    return opt?.label ?? "Newest";
  }, [sort]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const status = (j.status || "active").toLowerCase();
      if (status === "pending_review") {
        const creatorId = j.created_by ?? j.createdBy ?? "";
        if (String(creatorId) !== String(userId)) return false;
      }
      return true;
    });
  }, [jobs, userId]);

  const load = useCallback(() => {
    setFilters({ keyword: searchInput.trim() });
    fetchJobs(true);
  }, [searchInput, setFilters, fetchJobs]);

  useEffect(() => {
    fetchJobs(true);
  }, [category, sort]);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      fetchJobs(true);
    }, [fetchJobs])
  );

  const onRefresh = useCallback(() => refresh(), [refresh]);
  const onSearch = useCallback(() => {
    setFilters({ keyword: searchInput.trim() });
    fetchJobs(true);
  }, [searchInput, setFilters, fetchJobs]);

  const onCategorySelect = useCallback(
    (value) => {
      setFilters({ category: value });
      setCategoryDropdownVisible(false);
    },
    [setFilters]
  );

  const onSortSelect = useCallback(
    (value) => {
      setFilters({ sort: value });
      setSortDropdownVisible(false);
    },
    [setFilters]
  );

  const renderItem = useCallback(
    ({ item }) => {
      const creatorId = item.created_by ?? item.createdBy ?? "";
      const isCreator = String(creatorId) === String(userId);
      const status = (item.status || "active").toLowerCase();
      const riskScore = item.risk_score ?? item.riskScore ?? 0;
      const aiScamScore = item.ai_scam_score ?? item.aiScamScore ?? 0;
      const showRiskBadge = isCreator && (riskScore >= 60 || aiScamScore >= 80);

      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("JobDetail", { jobId: item.id })}
          activeOpacity={0.8}
        >
          {item.image_url || item.imageUrl ? (
            <Image source={{ uri: item.image_url || item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
              <MaterialIcons name="work" size={32} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.cardBody}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {isCreator && <StatusChip status={status} />}
            </View>
            <View style={styles.cardMeta}>
              <Text style={styles.cardCategory}>{item.category || "Job"}</Text>
              {item.salary ? (
                <Text style={styles.cardSalary} numberOfLines={1}>
                  {item.salary}
                </Text>
              ) : null}
            </View>
            {showRiskBadge && (
              <View style={styles.riskWrap}>
                <RiskBadge riskScore={riskScore} aiScamScore={aiScamScore} />
              </View>
            )}
            {item.location ? (
              <View style={styles.cardLocation}>
                <MaterialIcons name="location-on" size={14} color={colors.textMuted} />
                <Text style={styles.cardLocationText} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            ) : null}
            <View style={styles.cardFooter}>
              <Text style={styles.cardApply}>Apply</Text>
              <MaterialIcons name="arrow-forward" size={16} color={colors.primary} />
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [navigation, styles, colors, userId]
  );

  const listHeader = null;

  const filterRow = (
    <View style={styles.filterRow}>
      <TouchableOpacity
        style={styles.filterBtn}
        onPress={() => setCategoryDropdownVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.filterBtnText} numberOfLines={1}>
          {selectedCategoryLabel}
        </Text>
        <MaterialIcons name="keyboard-arrow-down" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.filterBtn}
        onPress={() => setSortDropdownVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.filterBtnText} numberOfLines={1}>
          {selectedSortLabel}
        </Text>
        <MaterialIcons name="keyboard-arrow-down" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const listEmpty =
    loading && jobs.length === 0 ? null : (
      <EmptyState variant="jobs" onRetry={load} />
    );

  const listFooter = useCallback(() => {
    if (loading && jobs.length > 0) {
      return (
        <View style={styles.footerLoader}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Loading more...</Text>
        </View>
      );
    }
    return null;
  }, [loading, jobs.length, styles, colors]);

  const ListHeaderComponent = (
    <>
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <MaterialIcons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, inputStyleAndroid]}
            placeholder={normalizePlaceholder("Search roles or locations")}
            placeholderTextColor={colors.textMuted}
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={onSearch}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={onSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>
      {filterRow}
      <Text style={styles.resultCount}>
        {total} {total === 1 ? "opportunity" : "opportunities"} found
      </Text>
    </>
  );

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {loading && jobs.length === 0 ? (
        <View style={styles.skeletonWrap}>
          {ListHeaderComponent}
          <View style={styles.skeletonList}>
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} variant="job" />
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={ListHeaderComponent}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          contentContainerStyle={filteredJobs.length === 0 ? styles.listEmpty : styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          onEndReached={() => {
            if (hasMore && !loading) fetchMore();
          }}
          onEndReachedThreshold={0.3}
          initialNumToRender={10}
        />
      )}
      <Modal visible={categoryDropdownVisible} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, webModalOverlay]} onPress={() => setCategoryDropdownVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }, webModalContent]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Category</Text>
            <ScrollView style={styles.modalList} nestedScrollEnabled>
              {JOB_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value || "all"}
                  style={[
                    styles.modalItem,
                    ((!category && !cat.value) || category === cat.value) && {
                      backgroundColor: colors.primary + "20",
                    },
                  ]}
                  onPress={() => onCategorySelect(cat.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalItemText, { color: colors.text }]}>{cat.label}</Text>
                  {((!category && !cat.value) || category === cat.value) && (
                    <MaterialIcons name="check" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseBtn, { borderTopColor: colors.border }]}
              onPress={() => setCategoryDropdownVisible(false)}
            >
              <Text style={[styles.modalCloseText, { color: colors.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
      <Modal visible={sortDropdownVisible} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, webModalOverlay]} onPress={() => setSortDropdownVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }, webModalContent]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Sort by</Text>
            <ScrollView style={styles.modalList}>
              {SORT_OPTIONS.map((o) => (
                <TouchableOpacity
                  key={o.value}
                  style={[
                    styles.modalItem,
                    (sort || "newest") === o.value && { backgroundColor: colors.primary + "20" },
                  ]}
                  onPress={() => onSortSelect(o.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalItemText, { color: colors.text }]}>{o.label}</Text>
                  {(sort || "newest") === o.value && (
                    <MaterialIcons name="check" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseBtn, { borderTopColor: colors.border }]}
              onPress={() => setSortDropdownVisible(false)}
            >
              <Text style={[styles.modalCloseText, { color: colors.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
      {isLoggedIn && otpVerified && kycFaceVerified && canPost && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("CreateJob")}
          activeOpacity={0.9}
        >
          <MaterialIcons name="add" size={28} color={colors.white} />
          <Text style={styles.fabText}>Post Job</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    headerTitle: { fontSize: 22, fontWeight: "800", color: colors.text },
    addBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    searchRow: {
      flexDirection: "row",
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
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
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    filterBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterBtnText: { fontSize: 14, color: colors.text, flex: 1 },
    resultCount: {
      fontSize: 13,
      color: colors.textMuted,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "flex-end",
    },
    modalContent: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: 34,
      maxHeight: "60%",
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    modalList: { maxHeight: 280 },
    modalItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    modalItemText: { fontSize: 16 },
    modalCloseBtn: {
      paddingVertical: spacing.md,
      alignItems: "center",
      borderTopWidth: 1,
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
    },
    modalCloseText: { fontSize: 16, fontWeight: "600" },
    listContent: { padding: spacing.md, paddingTop: 0, paddingBottom: 100 },
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
    cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs },
    cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, flex: 1 },
    cardMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 4 },
    cardCategory: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    cardSalary: { fontSize: 12, color: colors.textSecondary },
    riskWrap: { marginBottom: 4 },
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
    skeletonWrap: { flex: 1 },
    skeletonList: { paddingHorizontal: spacing.md },
    errorWrap: {
      padding: spacing.lg,
      alignItems: "center",
    },
    errorText: { fontSize: 14, color: colors.error, textAlign: "center", marginBottom: spacing.sm },
    retryText: { fontSize: 15, fontWeight: "600", color: colors.primary },
    footerLoader: { paddingVertical: spacing.md, alignItems: "center" },
    footerText: { fontSize: 13 },
    fab: {
      position: "absolute",
      bottom: 24,
      right: 24,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 24,
    },
    fabText: { fontSize: 16, fontWeight: "700", color: colors.white },
  });
}
