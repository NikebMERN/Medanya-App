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
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import * as missingApi from "../../services/missing.api";

export default function MissingListScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await missingApi.listMissingPersons({
        page: 1,
        limit: 30,
        q: searchQuery.trim() || undefined,
        status: "active",
      });
      setResults(res.results ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setResults([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    load();
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const renderItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("MissingDetail", { id: item._id || item.id })}
        activeOpacity={0.8}
      >
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <MaterialIcons name="person" size={36} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.fullName || "Missing Person"}
          </Text>
          {item.lastKnownLocationText ? (
            <View style={styles.cardLocation}>
              <MaterialIcons name="location-on" size={14} color={colors.textMuted} />
              <Text style={styles.cardLocationText} numberOfLines={1}>
                {item.lastKnownLocationText}
              </Text>
            </View>
          ) : null}
          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
      </TouchableOpacity>
    ),
    [navigation, styles, colors]
  );

  const listEmpty = loading ? null : (
    <View style={styles.empty}>
      <MaterialIcons name="person-search" size={48} color={colors.textMuted} />
      <Text style={styles.emptyText}>No active alerts</Text>
      <Text style={styles.emptySubtext}>Be the first to create one</Text>
    </View>
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Missing Alerts</Text>
        <View style={styles.headerRight} />
      </View>
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <MaterialIcons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or description"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={load}
            returnKeyType="search"
          />
        </View>
      </View>
      <Text style={styles.count}>{total} alert{total !== 1 ? "s" : ""}</Text>
      {loading && results.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item._id || item.id)}
          renderItem={renderItem}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={results.length === 0 ? styles.listEmpty : styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        />
      )}
    </View>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    wrapper: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { padding: spacing.sm },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center" },
    headerRight: { width: 40 },
    container: { flex: 1, backgroundColor: colors.background },
    searchRow: { padding: spacing.md },
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    searchInput: { flex: 1, paddingVertical: spacing.sm, fontSize: 15, color: colors.text },
    count: { fontSize: 13, color: colors.textMuted, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
    listContent: { padding: spacing.md, paddingTop: 0 },
    listEmpty: { flexGrow: 1 },
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: spacing.sm,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardImage: { width: 72, height: 72 },
    cardImagePlaceholder: {
      backgroundColor: colors.surfaceLight,
      justifyContent: "center",
      alignItems: "center",
    },
    cardBody: { flex: 1, padding: spacing.md },
    cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 },
    cardLocation: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
    cardLocationText: { fontSize: 12, color: colors.textMuted, flex: 1 },
    cardDesc: { fontSize: 13, color: colors.textSecondary },
    empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
    emptyText: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: spacing.md },
    emptySubtext: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
    loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  });
}
