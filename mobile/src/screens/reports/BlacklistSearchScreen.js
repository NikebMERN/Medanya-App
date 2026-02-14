import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { searchBlacklist } from "../../services/reports.api";

export default function BlacklistSearchScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async () => {
    const q = (query || "").trim();
    if (!q) {
      setResults([]);
      setSearched(true);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchBlacklist({ phone: q, name: q, page: 1, limit: 30 });
      setResults(res.results ?? []);
    } catch (err) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const renderItem = useCallback(
    ({ item }) => {
      const riskColor = item.riskLevel === "dangerous" ? colors.error : colors.warning;
      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate("BlacklistDetail", { item })
          }
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.employerName || item.phoneNumber || "Unknown"}
            </Text>
            <View style={[styles.riskBadge, { backgroundColor: riskColor + "30" }]}>
              <Text style={[styles.riskText, { color: riskColor }]}>
                {item.riskLevel?.toUpperCase() || "WARNING"}
              </Text>
            </View>
          </View>
          <Text style={styles.cardMeta}>
            {item.totalReports} report{item.totalReports !== 1 ? "s" : ""}
          </Text>
          {item.locationText ? (
            <Text style={styles.cardLocation} numberOfLines={1}>
              {item.locationText}
            </Text>
          ) : null}
        </TouchableOpacity>
      );
    },
    [navigation, styles, colors]
  );

  const listEmpty = searched ? (
    loading ? null : (
      <View style={styles.empty}>
        <MaterialIcons name="search-off" size={48} color={colors.textMuted} />
        <Text style={styles.emptyText}>No results found</Text>
        <Text style={styles.emptySubtext}>Try a different phone or name</Text>
      </View>
    )
  ) : (
    <View style={styles.empty}>
      <MaterialIcons name="search" size={48} color={colors.textMuted} />
      <Text style={styles.emptyText}>Search blacklist</Text>
      <Text style={styles.emptySubtext}>Enter phone number or employer name</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <MaterialIcons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Phone or name"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={doSearch}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={doSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>
      {loading && results.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.phoneNumber || String(Math.random())}
          renderItem={renderItem}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={results.length === 0 ? styles.listEmpty : styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={doSearch} colors={[colors.primary]} />
          }
        />
      )}
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    searchRow: { flexDirection: "row", padding: spacing.md, gap: spacing.sm },
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
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.primary,
      justifyContent: "center",
    },
    searchBtnText: { color: colors.white, fontWeight: "600", fontSize: 14 },
    listContent: { padding: spacing.md, paddingTop: 0 },
    listEmpty: { flexGrow: 1 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
    cardTitle: { fontSize: 16, fontWeight: "600", color: colors.text, flex: 1 },
    riskBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    riskText: { fontSize: 11, fontWeight: "700" },
    cardMeta: { fontSize: 13, color: colors.textMuted },
    cardLocation: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
    emptyText: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: spacing.md },
    emptySubtext: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
    loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  });
}
