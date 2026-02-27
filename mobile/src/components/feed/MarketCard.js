/**
 * MARKET ITEM CARD — Compact grid-style card.
 * Image, heart icon (favorite toggle), price pill, title, location
 */
import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { spacing } from "../../theme/spacing";
import { useThemeColors } from "../../theme/useThemeColors";
import { useFavoritesStore } from "../../store/favorites.store";

export default function MarketCard({ data, onPress, onShare }) {
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
    (Array.isArray(data?.preview?.imageUrls) && data.preview.imageUrls[0]) ||
    data?.preview?.imageUrl ||
    "";
  const title = data?.title ?? "Item";
  const price = data?.preview?.price ?? data?.summary?.split("•")[0] ?? "";
  const location = data?.location ?? "";

  const onHeartPress = (e) => {
    e?.stopPropagation?.();
    if (itemId) {
      toggleFavorite(itemId, { title, price, imageUrl, location });
    }
  };

  return (
    <TouchableOpacity onPress={() => onPress?.()} activeOpacity={0.9}>
      <View style={styles.card}>
        <View style={styles.imageWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <MaterialIcons name="storefront" size={32} color={colors.textMuted} />
            </View>
          )}
          <TouchableOpacity style={styles.heartBtn} onPress={onHeartPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name={isFav ? "favorite" : "favorite-border"} size={20} color={isFav ? (colors.error || "#e53935") : colors.textMuted} />
          </TouchableOpacity>
          {price ? (
            <View style={[styles.pricePill, { backgroundColor: colors.primary }]}>
              <Text style={styles.priceText}>{price}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          {location ? <Text style={styles.location} numberOfLines={1}>{location}</Text> : null}
          {onShare ? (
            <TouchableOpacity style={styles.shareBtn} onPress={(e) => { e?.stopPropagation?.(); onShare?.(); }} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <MaterialIcons name="share" size={18} color={colors.primary} />
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    imageWrap: { position: "relative", aspectRatio: 1 },
    image: { width: "100%", height: "100%" },
    imagePlaceholder: { backgroundColor: colors.surfaceLight, justifyContent: "center", alignItems: "center" },
    heartBtn: { position: "absolute", top: 8, right: 8, padding: 4 },
    pricePill: { position: "absolute", bottom: 8, left: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    priceText: { fontSize: 12, fontWeight: "700", color: "#fff" },
    cardFooter: { padding: spacing.sm },
    title: { fontSize: 14, fontWeight: "600", color: colors.text },
    location: { paddingTop: 2, fontSize: 12, color: colors.textMuted },
    shareBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.xs },
    shareBtnText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  });
}
