import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
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
import * as marketplaceApi from "../../services/marketplace.api";

export default function MarketplaceListScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const user = useAuthStore((s) => s.user);
  const otpVerified = !!(user?.otp_verified ?? user?.otpVerified);
  const isLoggedIn = !!useAuthStore((s) => s.token);

  const items = useMarketplaceStore((s) => s.items);
  const total = useMarketplaceStore((s) => s.total);
  const loading = useMarketplaceStore((s) => s.loading);
  const error = useMarketplaceStore((s) => s.error);
  const category = useMarketplaceStore((s) => s.category);
  const keyword = useMarketplaceStore((s) => s.keyword);
  const setItems = useMarketplaceStore((s) => s.setItems);
  const setLoading = useMarketplaceStore((s) => s.setLoading);
  const setError = useMarketplaceStore((s) => s.setError);
  const setFilters = useMarketplaceStore((s) => s.setFilters);

  const [searchInput, setSearchInput] = useState(keyword);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);
  const isFirstFocus = useRef(true);

  const selectedCategoryLabel = useMemo(() => {
    const cat = MARKETPLACE_CATEGORIES.find((c) => (c.value || "") === (category || ""));
    return cat?.label ?? "All categories";
  }, [category]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: 1, limit: 30, category: category || undefined, location: searchInput.trim() || undefined };
      const result = searchInput.trim()
        ? await marketplaceApi.searchItems({ ...params, q: searchInput.trim() })
        : await marketplaceApi.listItems(params);
      setItems(result.items, result.total, result.page);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || "Failed to load.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, searchInput, setItems, setLoading, setError]);

  useEffect(() => {
    load();
  }, [category]);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const onSearch = useCallback(() => {
    setFilters({ keyword: searchInput.trim() });
    load();
  }, [searchInput, setFilters, load]);

  const onCategorySelect = useCallback((value) => {
    setFilters({ category: value });
    setCategoryDropdownVisible(false);
  }, [setFilters]);

  const renderItem = useCallback(
    ({ item }) => {
      if (item.status === "sold") return null;
      const img = Array.isArray(item.image_urls) && item.image_urls[0] ? item.image_urls[0] : item.image_url;
      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("MarketplaceDetail", { itemId: item.id })}
          activeOpacity={0.8}
        >
          {img ? (
            <Image source={{ uri: img }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
              <MaterialIcons name="image-not-supported" size={32} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.cardPrice}>{item.price != null ? `${item.currency || "AED"} ${item.price}` : ""}</Text>
            {item.location ? (
              <View style={styles.cardLocation}>
                <MaterialIcons name="location-on" size={12} color={colors.textMuted} />
                <Text style={styles.cardLocationText} numberOfLines={1}>{item.location}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [navigation, styles, colors]
  );

  const listEmpty = loading ? null : (
    <View style={styles.empty}>
      <MaterialIcons name="storefront" size={48} color={colors.textMuted} />
      <Text style={styles.emptyText}>No listings found</Text>
      <Text style={styles.emptySubtext}>Try different filters or add your own</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <MaterialIcons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search or location"
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
      <TouchableOpacity
        style={styles.categoryDropdown}
        onPress={() => setCategoryDropdownVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.categoryDropdownText}>{selectedCategoryLabel}</Text>
        <MaterialIcons name="keyboard-arrow-down" size={24} color={colors.textSecondary} />
      </TouchableOpacity>
      <Modal visible={categoryDropdownVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setCategoryDropdownVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Category</Text>
            <ScrollView style={styles.modalList} nestedScrollEnabled>
              {MARKETPLACE_CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.value || "all"}
                  style={[styles.modalItem, (!category && !c.value) || category === c.value ? { backgroundColor: colors.primary + "20" } : null]}
                  onPress={() => onCategorySelect(c.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalItemText, { color: colors.text }]}>{c.label}</Text>
                  {((!category && !c.value) || category === c.value) && <MaterialIcons name="check" size={20} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.modalCloseBtn, { borderTopColor: colors.border }]} onPress={() => setCategoryDropdownVisible(false)}>
              <Text style={[styles.modalCloseText, { color: colors.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
      <Text style={styles.count}>{total} item{total !== 1 ? "s" : ""}</Text>
      {error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      ) : null}
      {loading && items.length === 0 ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={items.filter((i) => i.status !== "sold")}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={items.length === 0 ? styles.listEmpty : styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          initialNumToRender={8}
        />
      )}
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

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    searchRow: { flexDirection: "row", padding: spacing.md, gap: spacing.sm },
    searchWrap: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceLight, borderRadius: 12, paddingHorizontal: spacing.md, gap: spacing.sm },
    searchInput: { flex: 1, paddingVertical: spacing.sm, fontSize: 15, color: colors.text },
    searchBtn: { justifyContent: "center", paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 12, backgroundColor: colors.primary },
    searchBtnText: { color: colors.white, fontWeight: "600", fontSize: 14 },
    categoryDropdown: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryDropdownText: { fontSize: 15, color: colors.text, fontWeight: "500" },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
    modalContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 34, maxHeight: "60%" },
    modalTitle: { fontSize: 18, fontWeight: "700", paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
    modalList: { maxHeight: 280 },
    modalItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    modalItemText: { fontSize: 16 },
    modalCloseBtn: { paddingVertical: spacing.md, alignItems: "center", borderTopWidth: 1, marginHorizontal: spacing.lg, marginTop: spacing.sm },
    modalCloseText: { fontSize: 16, fontWeight: "600" },
    count: { fontSize: 13, color: colors.textMuted, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
    row: { gap: spacing.sm, marginBottom: spacing.sm, paddingHorizontal: spacing.md },
    card: { flex: 1, maxWidth: "48%", backgroundColor: colors.surface, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
    cardImage: { width: "100%", aspectRatio: 1 },
    cardImagePlaceholder: { backgroundColor: colors.surfaceLight, justifyContent: "center", alignItems: "center" },
    cardBody: { padding: spacing.sm },
    cardTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
    cardPrice: { fontSize: 14, fontWeight: "700", color: colors.primary, marginTop: 2 },
    cardLocation: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    cardLocationText: { fontSize: 11, color: colors.textMuted, flex: 1 },
    listContent: { paddingBottom: 80 },
    listEmpty: { flexGrow: 1 },
    empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
    emptyText: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: spacing.md },
    emptySubtext: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
    errorWrap: { padding: spacing.md, alignItems: "center" },
    errorText: { fontSize: 14, color: colors.error, marginBottom: spacing.sm },
    retryText: { fontSize: 15, fontWeight: "600", color: colors.primary },
    loader: { flex: 1, justifyContent: "center", alignItems: "center" },
    fab: { position: "absolute", bottom: 24, right: 24, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 24 },
    fabText: { fontSize: 16, fontWeight: "700", color: colors.white },
  });
}
