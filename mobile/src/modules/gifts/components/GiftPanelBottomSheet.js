/**
 * GiftPanelBottomSheet — TikTok-style gift panel for Live stream.
 * Grid of gifts, quantity selector, send button.
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../../theme/useThemeColors";
import { radii } from "../../../theme/designSystem";
import { spacing } from "../../../theme/spacing";
import { useGiftsStore } from "../gifts.store";
import { useWalletStore } from "../../wallet/wallet.store";
import { trackEvent } from "../../../utils/trackEvent";

const QTY_OPTIONS = [1, 5, 10];
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GIFT_ITEM_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - spacing.md * 3) / 4;

export default function GiftPanelBottomSheet({
  visible,
  onClose,
  streamId,
  creatorId,
  onGiftSent,
  onRecharge,
}) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = createStyles(colors, insets);

  const {
    giftCatalog,
    selectedGift,
    quantity,
    sending,
    error,
    fetchCatalog,
    setSelectedGift,
    setQuantity,
    sendGift,
    setError,
  } = useGiftsStore();
  const { coinBalance, fetchWallet } = useWalletStore();

  useEffect(() => {
    if (visible) {
      fetchCatalog();
      setError(null);
    }
  }, [visible, fetchCatalog, setError]);

  const totalCost = (selectedGift?.cost ?? 0) * quantity;
  const balance = coinBalance ?? 0;
  const insufficient = totalCost > balance && selectedGift;

  const handleSend = async () => {
    if (!selectedGift || !streamId) {
      Alert.alert("Select a gift", "Choose a gift to send.");
      return;
    }
    if (insufficient) {
      Alert.alert("Insufficient balance", "Recharge MedCoins to send gifts.", [
        { text: "Cancel" },
        { text: "Recharge", onPress: () => { onClose?.(); onRecharge?.(); } },
      ]);
      return;
    }
    try {
      await sendGift(streamId, selectedGift.id, quantity);
      await fetchWallet();
      trackEvent("livestream_gift", "stream", streamId, { amountCoins: totalCost });
      onGiftSent?.();
      onClose?.();
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.error?.message ?? e?.message ?? "Failed to send gift");
    }
  };

  const iconName = (g) => {
    const map = {
      "local-florist": "local-florist",
      favorite: "favorite",
      star: "star",
      diamond: "diamond",
      "workspace-premium": "workspace-premium",
      "rocket-launch": "rocket-launch",
    };
    return map[g?.icon] || "card-giftcard";
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Send a Gift</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={giftCatalog}
            keyExtractor={(item) => String(item.id)}
            numColumns={4}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            renderItem={({ item }) => {
              const isSelected = selectedGift?.id === item.id;
              return (
                <TouchableOpacity
                  style={[styles.giftItem, isSelected && styles.giftItemSelected]}
                  onPress={() => setSelectedGift(item)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={iconName(item)}
                    size={32}
                    color={isSelected ? colors.primary : colors.text}
                  />
                  <Text style={styles.giftName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.giftCost}>{item.cost} MC</Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No gifts available</Text>
              </View>
            }
          />

          <View style={styles.quantityRow}>
            <Text style={styles.quantityLabel}>Quantity</Text>
            {QTY_OPTIONS.map((q) => (
              <TouchableOpacity
                key={q}
                style={[styles.qtyBtn, quantity === q && styles.qtyBtnActive]}
                onPress={() => setQuantity(q)}
              >
                <Text style={[styles.qtyText, quantity === q && styles.qtyTextActive]}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.sendBtn, (sending || !selectedGift || insufficient) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={sending || !selectedGift || insufficient}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.sendBtnText}>
                Send{selectedGift ? ` ${quantity}× ${selectedGift.name} (${totalCost} MC)` : ""}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.footer}>Your balance: {balance} MC</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors, insets) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: (insets?.bottom || 0) + spacing.lg,
      paddingHorizontal: spacing.lg,
      maxHeight: "75%",
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
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
    title: { fontSize: 20, fontWeight: "800", color: colors.text },
    gridContent: { paddingBottom: spacing.md },
    gridRow: { marginBottom: spacing.sm, gap: spacing.md },
    giftItem: {
      width: GIFT_ITEM_WIDTH,
      alignItems: "center",
      paddingVertical: spacing.md,
      borderRadius: radii.input,
      borderWidth: 2,
      borderColor: "transparent",
    },
    giftItemSelected: { borderColor: colors.primary, backgroundColor: colors.primary + "15" },
    giftName: { fontSize: 12, fontWeight: "600", color: colors.text, marginTop: 4 },
    giftCost: { fontSize: 11, color: colors.primary, marginTop: 2 },
    empty: { padding: spacing.xl, alignItems: "center" },
    emptyText: { fontSize: 14, color: colors.textMuted },
    quantityRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg, gap: spacing.sm },
    quantityLabel: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginRight: spacing.sm },
    qtyBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radii.button,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    qtyBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    qtyText: { fontSize: 14, fontWeight: "700", color: colors.text },
    qtyTextActive: { color: colors.white },
    sendBtn: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: radii.button,
      alignItems: "center",
    },
    sendBtnDisabled: { opacity: 0.6 },
    sendBtnText: { fontSize: 16, fontWeight: "700", color: colors.white },
    footer: { fontSize: 14, color: colors.textMuted, textAlign: "center", marginTop: spacing.md },
    errorText: { fontSize: 13, color: colors.error, textAlign: "center", marginTop: spacing.sm },
  });
}
