/**
 * MarketplaceGridCard — 2-column grid card for Marketplace screen.
 * Product image full width top, price chip on image, title below, location, heart/save top-right.
 */
import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { spacing } from "../../theme/spacing";
import { useThemeColors } from "../../theme/useThemeColors";
import { useFavoritesStore } from "../../store/favorites.store";
import PriceBadge from "./PriceBadge";
import SellerTrustBadge from "./SellerTrustBadge";

export default function MarketplaceGridCard({ item, onPress }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const itemId = item?.id ?? "";
  const isFav = useFavoritesStore((s) => (s.favoriteIds || []).includes(String(itemId)));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const hydrate = useFavoritesStore((s) => s.hydrate);

  useEffect(() => {
    if (!useFavoritesStore.getState().hydrated) hydrate();
  }, [hydrate]);

  const imageUrl = (Array.isArray(item?.image_urls) && item.image_urls[0]) || item?.image_url || "";
  const title = item?.title ?? "Item";
  const price = item?.price ?? null;
  const location = item?.location ?? "";
  const currency = item?.currency ?? "AED";

  const onHeartPress = (e) => {
    e?.stopPropagation?.();
    if (itemId) toggleFavorite(itemId, { title, price, imageUrl, location });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.()} activeOpacity={0.8}>
      <View style={styles.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <MaterialIcons name="image-not-supported" size={28} color={colors.textMuted} />
          </View>
        )}
        <TouchableOpacity style={styles.heartBtn} onPress={onHeartPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name={isFav ? "favorite" : "favorite-border"} size={18} color={isFav ? (colors.error || "#e53935") : colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.priceOverlay}>
          <PriceBadge price={price} currency={currency} variant="marketplace" />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {location ? (
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={10} color={colors.textMuted} />
            <Text style={styles.location} numberOfLines={1}>{location}</Text>
          </View>
        ) : null}
        <SellerTrustBadge isVerified={item?.sellerVerified} />
      </View>
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: {
      flex: 1,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    imageWrap: { position: "relative", aspectRatio: 1, backgroundColor: colors.surfaceLight },
    image: { width: "100%", height: "100%" },
    imagePlaceholder: { backgroundColor: colors.surfaceLight, justifyContent: "center", alignItems: "center" },
    heartBtn: { position: "absolute", top: 8, right: 8, padding: 4, zIndex: 2 },
    priceOverlay: { position: "absolute", bottom: 8, left: 8, zIndex: 2 },
    body: { padding: spacing.sm },
    title: { fontSize: 14, fontWeight: "600", color: colors.text },
    locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    location: { fontSize: 11, color: colors.textMuted, flex: 1 },
  });
}
