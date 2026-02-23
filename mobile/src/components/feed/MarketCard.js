/**
 * MARKET ITEM CARD — Compact grid-style card.
 * Image, heart icon, price pill, title, location
 */
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { spacing } from "../../theme/spacing";
import { useThemeColors } from "../../theme/useThemeColors";

export default function MarketCard({ data, onPress }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const imageUrl =
    (Array.isArray(data?.preview?.imageUrls) && data.preview.imageUrls[0]) ||
    data?.preview?.imageUrl ||
    "";
  const title = data?.title ?? "Item";
  const price = data?.preview?.price ?? data?.summary?.split("•")[0] ?? "";
  const location = data?.location ?? "";

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
          <TouchableOpacity style={styles.heartBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="favorite-border" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          {price ? (
            <View style={[styles.pricePill, { backgroundColor: colors.primary }]}>
              <Text style={styles.priceText}>{price}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {location ? <Text style={styles.location} numberOfLines={1}>{location}</Text> : null}
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
    title: { padding: spacing.sm, fontSize: 14, fontWeight: "600", color: colors.text },
    location: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, fontSize: 12, color: colors.textMuted },
  });
}
