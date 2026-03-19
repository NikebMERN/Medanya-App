/**
 * MarketplaceReelCard — Horizontal scroll card (same design system as VideoReelCard).
 * Image, price badge, title, location, favorite (heart) icon.
 */
import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { spacing } from "../../theme/spacing";
import { useThemeColors } from "../../theme/useThemeColors";
import { useFavoritesStore } from "../../store/favorites.store";
import PriceBadge from "./PriceBadge";

const CARD_WIDTH = 120;
const CARD_HEIGHT = 180;

export default function MarketplaceReelCard({ data, onPress }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const itemId = data?.id ?? data?.itemId ?? "";
  const isFav = useFavoritesStore((s) => (s.favoriteIds || []).includes(String(itemId)));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const hydrate = useFavoritesStore((s) => s.hydrate);

  useEffect(() => {
    if (!useFavoritesStore.getState().hydrated) hydrate();
  }, [hydrate]);

  const imageUrl =
    (Array.isArray(data?.preview?.imageUrls) && data.preview.imageUrls[0]) || data?.preview?.imageUrl || "";
  const title = data?.title ?? "Item";
  const price = data?.preview?.price ?? null;
  const location = data?.location ?? "";
  const currency = data?.preview?.currency ?? "AED";

  const onHeartPress = (e) => {
    e?.stopPropagation?.();
    if (itemId) toggleFavorite(itemId, { title, price, imageUrl, location });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.()} activeOpacity={0.9}>
      <View style={styles.thumbWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <MaterialIcons name="storefront" size={32} color={colors.textMuted} />
          </View>
        )}
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={onHeartPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons
            name={isFav ? "favorite" : "favorite-border"}
            size={20}
            color={isFav ? (colors.error || "#e53935") : "rgba(255,255,255,0.9)"}
          />
        </TouchableOpacity>
        <View style={styles.priceOverlay}>
          <PriceBadge price={price} currency={currency} variant="marketplace" />
        </View>
      </View>
      <Text style={[styles.caption, { color: colors.text }]} numberOfLines={2}>{title}</Text>
      {location ? (
        <View style={styles.locationRow}>
          <MaterialIcons name="location-on" size={10} color={colors.textMuted} />
          <Text style={[styles.locationText, { color: colors.textMuted }]} numberOfLines={1}>{location}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: { width: CARD_WIDTH, marginRight: spacing.sm },
    thumbWrap: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: colors.surfaceLight,
    },
    thumb: { width: "100%", height: "100%" },
    thumbPlaceholder: { justifyContent: "center", alignItems: "center" },
    heartBtn: { position: "absolute", top: 6, right: 6, padding: 4, zIndex: 2 },
    priceOverlay: { position: "absolute", bottom: 6, left: 6, zIndex: 2 },
    caption: { fontSize: 12, fontWeight: "600", marginTop: 6 },
    locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    locationText: { fontSize: 10, flex: 1 },
  });
}
