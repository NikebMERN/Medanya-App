/**
 * MarketplaceFeedCard — Compact card for Home feed (horizontal/vertical).
 * Dark/light theme, rounded 18px, product image, title, price badge, location, save icon, View Item button.
 */
import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { spacing } from "../../theme/spacing";
import { useThemeColors } from "../../theme/useThemeColors";
import { useFavoritesStore } from "../../store/favorites.store";
import PriceBadge from "./PriceBadge";
import SellerTrustBadge from "./SellerTrustBadge";

export default function MarketplaceFeedCard({ data, onPress, onShare }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
  const price = data?.preview?.price ?? data?.summary?.split("•")[0] ?? null;
  const location = data?.location ?? "";
  const currency = data?.preview?.currency ?? "AED";

  const onHeartPress = (e) => {
    e?.stopPropagation?.();
    if (itemId) toggleFavorite(itemId, { title, price, imageUrl, location });
  };

  return (
    <TouchableOpacity onPress={() => onPress?.()} activeOpacity={0.9}>
      <View style={styles.card}>
        <View style={styles.imageWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <MaterialIcons name="storefront" size={28} color={colors.textMuted} />
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
              <MaterialIcons name="location-on" size={12} color={colors.textMuted} />
              <Text style={styles.location} numberOfLines={1}>{location}</Text>
            </View>
          ) : null}
          <View style={styles.footer}>
            <SellerTrustBadge isVerified={data?.sellerVerified} />
            <TouchableOpacity
              style={[styles.viewBtn, { backgroundColor: colors.primary }]}
              onPress={(e) => { e?.stopPropagation?.(); onPress?.(); }}
            >
              <Text style={styles.viewBtnText}>View Item</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    imageWrap: { position: "relative", aspectRatio: 1.2 },
    image: { width: "100%", height: "100%" },
    imagePlaceholder: { backgroundColor: colors.surfaceLight, justifyContent: "center", alignItems: "center" },
    heartBtn: { position: "absolute", top: 8, right: 8, padding: 4, zIndex: 2 },
    priceOverlay: { position: "absolute", bottom: 8, left: 8, zIndex: 2 },
    body: { padding: spacing.md },
    title: { fontSize: 15, fontWeight: "600", color: colors.text },
    locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    location: { fontSize: 12, color: colors.textMuted, flex: 1 },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.sm,
    },
    viewBtn: { paddingHorizontal: spacing.md, paddingVertical: 10, minHeight: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    viewBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  });
}
