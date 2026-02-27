import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { spacing } from "../theme/spacing";
import client from "../api/client";
import * as marketplaceApi from "../services/marketplace.api";

export default function PinItemSheet({
  visible,
  onClose,
  videoId,
  streamId,
  creatorId,
  onItemPress,
}) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = createStyles(colors, insets);

  const [pinnedItems, setPinnedItems] = useState([]);
  const [shopItems, setShopItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    try {
      let pins = [];
      if (videoId) {
        const { data } = await client.get(`/videos/${videoId}/pins`);
        pins = data?.items ?? [];
      } else if (streamId) {
        const { data } = await client.get(`/live/${streamId}/pins`);
        pins = data?.items ?? [];
      }

      setPinnedItems(pins);

      if (creatorId) {
        const res = await marketplaceApi.listItems({
          sellerId: creatorId,
          limit: 20,
        });
        const items = res?.items ?? [];
        const pinnedIds = new Set(pins.map((p) => String(p.id)));
        const notPinned = items.filter((i) => !pinnedIds.has(String(i.id)));
        setShopItems(notPinned);
      } else {
        setShopItems([]);
      }
    } catch (_) {
      setPinnedItems([]);
      setShopItems([]);
    } finally {
      setLoading(false);
    }
  }, [visible, videoId, streamId, creatorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allItems = [...pinnedItems, ...shopItems];

  const renderItem = ({ item }) => {
    const img = Array.isArray(item.image_urls) && item.image_urls[0] ? item.image_urls[0] : item.image_url;
    const price = item.price != null ? `${item.currency || "AED"} ${item.price}` : "";

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => {
          onItemPress?.(item);
          onClose?.();
        }}
        activeOpacity={0.8}
      >
        <View style={styles.itemImageWrap}>
          {img ? (
            <Image source={{ uri: img }} style={styles.itemImage} resizeMode="cover" />
          ) : (
            <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
              <MaterialIcons name="image-not-supported" size={32} color={colors.textMuted} />
            </View>
          )}
        </View>
        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
        {price ? <Text style={styles.itemPrice}>{price}</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Shop</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : allItems.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialIcons name="storefront" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No items to show</Text>
            </View>
          ) : (
            <>
              {pinnedItems.length > 0 && (
                <Text style={styles.sectionLabel}>Pinned</Text>
              )}
              <FlatList
                data={allItems}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                numColumns={2}
                columnWrapperStyle={styles.row}
                contentContainerStyle={styles.listContent}
              />
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors, insets) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "70%",
      paddingBottom: (insets?.bottom || 0) + spacing.lg,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    title: { fontSize: 18, fontWeight: "700", color: colors.text },
    loadingWrap: { padding: spacing.xxl, alignItems: "center" },
    emptyWrap: {
      padding: spacing.xxl,
      alignItems: "center",
    },
    emptyText: { fontSize: 16, color: colors.textMuted, marginTop: spacing.sm },
    sectionLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm,
    },
    listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    row: { gap: spacing.md, marginBottom: spacing.md },
    itemCard: {
      flex: 1,
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      overflow: "hidden",
    },
    itemImageWrap: { aspectRatio: 1 },
    itemImage: { width: "100%", height: "100%" },
    itemImagePlaceholder: {
      backgroundColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    itemTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      padding: spacing.sm,
      paddingBottom: 2,
    },
    itemPrice: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.primary,
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.sm,
    },
  });
}
