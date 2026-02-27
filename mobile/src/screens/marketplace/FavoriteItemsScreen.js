import React, { useCallback, useEffect, useMemo } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useFavoritesStore } from "../../store/favorites.store";
import SubScreenHeader from "../../components/SubScreenHeader";

export default function FavoriteItemsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);

  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const snippets = useFavoritesStore((s) => s.snippets);
  const hydrate = useFavoritesStore((s) => s.hydrate);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const items = useMemo(
    () =>
      favoriteIds.map((id) => ({
        id,
        ...(snippets[id] || {}),
      })),
    [favoriteIds, snippets]
  );

  const renderItem = useCallback(
    ({ item }) => {
      const title = item.title || "Item";
      const price = item.price || "";
      const imageUrl = item.imageUrl || "";
      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("Marketplace", { screen: "MarketplaceDetail", params: { itemId: item.id } })}
          activeOpacity={0.8}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
              <MaterialIcons name="storefront" size={32} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
            {price ? <Text style={styles.cardPrice}>{price}</Text> : null}
            {item.location ? (
              <View style={styles.cardLocation}>
                <MaterialIcons name="location-on" size={12} color={colors.textMuted} />
                <Text style={styles.cardLocationText} numberOfLines={1}>{item.location}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => toggleFavorite(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="favorite" size={22} color={colors.error || "#e53935"} />
          </TouchableOpacity>
          <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      );
    },
    [navigation, styles, colors, toggleFavorite]
  );

  const listEmpty = (
    <View style={styles.empty}>
      <MaterialIcons name="favorite-border" size={56} color={colors.textMuted} />
      <Text style={styles.emptyText}>No favorite items</Text>
      <Text style={styles.emptySubtext}>Tap the heart on marketplace items to save them here</Text>
      <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate("Marketplace")}>
        <Text style={styles.browseBtnText}>Browse Marketplace</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <SubScreenHeader
        title="Favorite items"
        onBack={() => navigation.goBack()}
        showProfileDropdown
        navigation={navigation.getParent?.() ?? navigation}
      />
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={items.length === 0 ? styles.listEmpty : styles.listContent}
        ListEmptyComponent={listEmpty}
      />
    </View>
  );
}

function createStyles(colors, paddingTop) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { padding: spacing.md, paddingBottom: spacing.xxl },
    listEmpty: { flexGrow: 1 },
    empty: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.xl,
      paddingTop: paddingTop + spacing.xl,
    },
    emptyText: { fontSize: 18, fontWeight: "600", color: colors.text, marginTop: spacing.md },
    emptySubtext: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs, textAlign: "center" },
    browseBtn: {
      marginTop: spacing.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    browseBtnText: { fontSize: 16, fontWeight: "600", color: "#fff" },
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
    cardImage: { width: 80, height: 80 },
    cardImagePlaceholder: { backgroundColor: colors.surfaceLight, justifyContent: "center", alignItems: "center" },
    cardBody: { flex: 1, padding: spacing.md },
    cardTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
    cardPrice: { fontSize: 14, fontWeight: "700", color: colors.primary, marginTop: 2 },
    cardLocation: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    cardLocationText: { fontSize: 12, color: colors.textMuted, flex: 1 },
    heartBtn: { padding: spacing.sm },
  });
}
