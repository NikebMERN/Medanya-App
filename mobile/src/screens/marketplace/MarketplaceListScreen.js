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
import { useMarketplaceStore, MARKETPLACE_CATEGORIES } from "../../store/marketplace.store";
import { useAuthStore } from "../../store/auth.store";
import StatusChip from "../../components/StatusChip";
import MarketplaceGridCard from "../../components/marketplace/MarketplaceGridCard";
import RiskBadge from "../../components/RiskBadge";
import SkeletonCard from "../../components/SkeletonCard";
import EmptyState from "../../components/EmptyState";
import { normalizePlaceholder } from "../../components/ui/Input";
import { inputStyleAndroid } from "../../theme/inputStyles";
import { webModalOverlay, webModalContent } from "../../theme/webLayout";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
];

export default function MarketplaceListScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const userId = useAuthStore((s) => s.user?.id ?? s.user?.userId ?? "");
  const otpVerified = !!(useAuthStore((s) => s.user?.otp_verified ?? s.user?.otpVerified));
  const isLoggedIn = !!useAuthStore((s) => s.token);

  const items = useMarketplaceStore((s) => s.items);
  const total = useMarketplaceStore((s) => s.total);
  const loading = useMarketplaceStore((s) => s.loading);
  const error = useMarketplaceStore((s) => s.error);
  const refreshing = useMarketplaceStore((s) => s.refreshing);
  const hasMore = useMarketplaceStore((s) => s.hasMore);
  const category = useMarketplaceStore((s) => s.category);
  const location = useMarketplaceStore((s) => s.location);
  const keyword = useMarketplaceStore((s) => s.keyword);
  const sort = useMarketplaceStore((s) => s.sort);
  const setFilters = useMarketplaceStore((s) => s.setFilters);
  const setViewerId = useMarketplaceStore((s) => s.setViewerId);
  const fetchItems = useMarketplaceStore((s) => s.fetchItems);
  const fetchMore = useMarketplaceStore((s) => s.fetchMore);
  const refresh = useMarketplaceStore((s) => s.refresh);

  const [searchInput, setSearchInput] = useState(keyword || "");
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);
  const [sortDropdownVisible, setSortDropdownVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationInput, setLocationInput] = useState(location || "");
  const isFirstFocus = useRef(true);

  useEffect(() => {
    setViewerId(userId);
  }, [userId, setViewerId]);

  const selectedCategoryLabel = useMemo(() => {
    const cat = MARKETPLACE_CATEGORIES.find((c) => (c.value || "") === (category || ""));
    return cat?.label ?? "All categories";
  }, [category]);

  const selectedSortLabel = useMemo(() => {
    const opt = SORT_OPTIONS.find((o) => (o.value || "") === (sort || "newest"));
    return opt?.label ?? "Newest";
  }, [sort]);

  const selectedLocationLabel = location?.trim() ? location : "Location";

  const onLocationApply = useCallback(() => {
    setFilters({ location: locationInput.trim() });
    setLocationModalVisible(false);
    fetchItems(true);
  }, [locationInput, setFilters, fetchItems]);

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (i.status === "sold") return false;
      const status = (i.status || "active").toLowerCase();
      if (status === "pending_review") {
        const sellerId = i.seller_id ?? i.sellerId ?? "";
        if (String(sellerId) !== String(userId)) return false;
      }
      return true;
    });
  }, [items, userId]);

  const load = useCallback(() => {
    setFilters({ keyword: searchInput.trim() });
    fetchItems(true);
  }, [searchInput, setFilters, fetchItems]);

  useEffect(() => {
    fetchItems(true);
  }, [category, sort, location]);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      fetchItems(true);
    }, [fetchItems])
  );

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const onSearch = useCallback(() => {
    setFilters({ keyword: searchInput.trim() });
    fetchItems(true);
  }, [searchInput, setFilters, fetchItems]);

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
      const sellerId = item.seller_id ?? item.sellerId ?? "";
      const isCreator = String(sellerId) === String(userId);
      const status = (item.status || "active").toLowerCase();
      const riskScore = item.risk_score ?? item.riskScore ?? 0;
      const aiScamScore = item.ai_scam_score ?? item.aiScamScore ?? 0;
      const showRiskBadge = isCreator && (riskScore >= 60 || aiScamScore >= 80);

      return (
        <View style={styles.cardWrapper}>
          <MarketplaceGridCard
            item={item}
            onPress={() => navigation.navigate("MarketplaceDetail", { itemId: item.id })}
          />
          {isCreator && (
            <View style={styles.cardOverlay}>
              <StatusChip status={status} />
            </View>
          )}
          {showRiskBadge && (
            <View style={styles.riskWrap}>
              <RiskBadge riskScore={riskScore} aiScamScore={aiScamScore} />
            </View>
          )}
        </View>
      );
    },
    [navigation, styles, userId]
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
      <TouchableOpacity
        style={styles.filterBtn}
        onPress={() => setLocationModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.filterBtnText} numberOfLines={1}>
          {location?.trim() ? location : "Location"}
        </Text>
        <MaterialIcons name="location-on" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const listEmpty =
    loading && items.length === 0 ? null : (
      <EmptyState variant="items" onRetry={load} />
    );

  const listFooter = useCallback(() => {
    if (loading && items.length > 0) {
      return (
        <View style={styles.footerLoader}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Loading more...</Text>
        </View>
      );
    }
    return null;
  }, [loading, items.length, styles, colors]);

  const ListHeaderComponent = (
    <>
      {listHeader}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <MaterialIcons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, inputStyleAndroid]}
            placeholder={normalizePlaceholder("Search or location")}
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
      <Text style={styles.count}>
        {total} item{total !== 1 ? "s" : ""}
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
      {loading && items.length === 0 ? (
        <View style={styles.skeletonWrap}>
          {ListHeaderComponent}
          <View style={styles.skeletonGrid}>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} variant="marketplace" />
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          ListHeaderComponent={ListHeaderComponent}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          contentContainerStyle={filteredItems.length === 0 ? styles.listEmpty : styles.listContent}
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
          initialNumToRender={8}
        />
      )}
      <Modal visible={categoryDropdownVisible} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, webModalOverlay]} onPress={() => setCategoryDropdownVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }, webModalContent]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Category</Text>
            <ScrollView style={styles.modalList} nestedScrollEnabled>
              {MARKETPLACE_CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.value || "all"}
                  style={[
                    styles.modalItem,
                    ((!category && !c.value) || category === c.value) && {
                      backgroundColor: colors.primary + "20",
                    },
                  ]}
                  onPress={() => onCategorySelect(c.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalItemText, { color: colors.text }]}>{c.label}</Text>
                  {((!category && !c.value) || category === c.value) && (
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
      <Modal visible={locationModalVisible} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, webModalOverlay]} onPress={() => setLocationModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }, webModalContent]} onPress={(e) => e.stopPropagation?.()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Filter by location</Text>
            <TextInput
              style={[styles.locationInput, inputStyleAndroid, { color: colors.text, borderColor: colors.border }]}
              placeholder={normalizePlaceholder("Enter city or area")}
              placeholderTextColor={colors.textMuted}
              value={locationInput}
              onChangeText={setLocationInput}
              onSubmitEditing={onLocationApply}
            />
            <View style={styles.modalLocationActions}>
              <TouchableOpacity
                style={[styles.modalLocationBtn, { borderColor: colors.border }]}
                onPress={() => { setFilters({ location: "" }); setLocationInput(""); setLocationModalVisible(false); fetchItems(true); }}
              >
                <Text style={[styles.modalLocationBtnText, { color: colors.textMuted }]}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalLocationBtnPrimary, { backgroundColor: colors.primary }]} onPress={onLocationApply}>
                <Text style={styles.modalLocationBtnPrimaryText}>Apply</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.modalCloseBtn, { borderTopColor: colors.border }]} onPress={() => setLocationModalVisible(false)}>
              <Text style={[styles.modalCloseText, { color: colors.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      {isLoggedIn && otpVerified && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("CreateItem")}
          activeOpacity={0.9}
        >
          <MaterialIcons name="add" size={28} color={colors.white} />
          <Text style={styles.fabText}>Sell</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString();
  } catch (_) {
    return "";
  }
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
    searchRow: { flexDirection: "row", padding: spacing.md, paddingTop: spacing.md, gap: spacing.sm },
    searchWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    searchInput: { flex: 1, paddingVertical: spacing.sm, fontSize: 15, color: colors.text },
    searchBtn: {
      justifyContent: "center",
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
    count: {
      fontSize: 13,
      color: colors.textMuted,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
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
    locationInput: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 15,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    modalLocationActions: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
    modalLocationBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: 12, borderWidth: 1, alignItems: "center" },
    modalLocationBtnText: { fontSize: 16, fontWeight: "600" },
    modalLocationBtnPrimary: { flex: 1, paddingVertical: spacing.md, borderRadius: 12, alignItems: "center" },
    modalLocationBtnPrimaryText: { fontSize: 16, fontWeight: "600", color: "#fff" },
    row: { gap: spacing.sm, marginBottom: spacing.sm, paddingHorizontal: spacing.md },
    cardWrapper: { flex: 1, minWidth: 0, position: "relative" },
    cardOverlay: { position: "absolute", top: spacing.sm, left: spacing.sm, zIndex: 2 },
    riskWrap: { position: "absolute", top: spacing.sm, right: spacing.sm, zIndex: 2 },
    card: {
      flex: 1,
      maxWidth: "48%",
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardImage: { width: "100%", aspectRatio: 1 },
    cardImagePlaceholder: {
      backgroundColor: colors.surfaceLight,
      justifyContent: "center",
      alignItems: "center",
    },
    cardBody: { padding: spacing.sm },
    cardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.xs,
    },
    cardTitle: { fontSize: 14, fontWeight: "600", color: colors.text, flex: 1 },
    cardPrice: { fontSize: 14, fontWeight: "700", color: colors.primary, marginTop: 2 },
    riskWrap: { marginTop: 4 },
    cardLocation: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    cardLocationText: { fontSize: 11, color: colors.textMuted, flex: 1 },
    cardTime: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
    listContent: { paddingBottom: 100 },
    listEmpty: { flexGrow: 1 },
    skeletonWrap: { flex: 1 },
    skeletonGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    errorWrap: {
      padding: spacing.md,
      alignItems: "center",
      backgroundColor: colors.background,
    },
    errorText: { fontSize: 14, color: colors.error, marginBottom: spacing.sm },
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
