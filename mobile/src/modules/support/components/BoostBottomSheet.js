import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, ActivityIndicator, Alert, Checkbox } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../../theme/useThemeColors";
import { radii } from "../../../theme/designSystem";
import { spacing } from "../../../theme/spacing";
import { RulerSlider } from "./RulerSlider";
import { ManualAmountInput } from "./ManualAmountInput";
import { useWalletStore } from "../../wallet/wallet.store";
import * as walletApi from "../../wallet/wallet.api";
import { trackEvent } from "../../../utils/trackEvent";

const MIN = 1;
const MAX = 99999;

export default function BoostBottomSheet({
  visible,
  onClose,
  creatorId,
  creatorName,
  context = "VIDEO",
  contextId,
  isOwnContent,
  onSuccess,
  onRecharge,
}) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = createStyles(colors, insets);

  const { coinBalance, fetchWallet } = useWalletStore();
  const [manualMode, setManualMode] = useState(false);
  const [amount, setAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [followCreator, setFollowCreator] = useState(false);

  const balance = coinBalance ?? 0;
  const insufficient = balance < amount;

  const handleConfirm = useCallback(async () => {
    if (isOwnContent) {
      Alert.alert("Not allowed", "You cannot Boost your own content.");
      return;
    }
    if (insufficient) {
      Alert.alert("Insufficient balance", "Recharge MedCoins to Boost.", [
        { text: "Cancel" },
        { text: "Recharge", onPress: () => { onClose?.(); onRecharge?.(); } },
      ]);
      return;
    }
    if (!creatorId || amount < MIN) return;
    setLoading(true);
    try {
      await walletApi.boostCreator({ creatorId, amount, context, contextId });
      useWalletStore.getState().updateBalanceAfterBoost(amount);
      trackEvent(context === "LIVE" ? "boost_live" : "boost_video", context === "LIVE" ? "stream" : "video", contextId, { amountCoins: amount });
      onSuccess?.();
      onClose?.();
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.error?.message ?? e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }, [creatorId, amount, context, contextId, isOwnContent, insufficient, onSuccess, onClose]);

  if (isOwnContent) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.disabledText}>You cannot Boost your own content.</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Boost this creator</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>10 people boosted</Text>
          <View style={styles.amountSection}>
            {manualMode ? (
              <ManualAmountInput value={amount} onChange={setAmount} />
            ) : (
              <RulerSlider value={amount} onValueChange={setAmount} min={MIN} max={500} />
            )}
            <TouchableOpacity style={styles.toggleBtn} onPress={() => setManualMode((m) => !m)}>
              <Text style={styles.toggleText}>{manualMode ? "Use slider" : "Type amount instead"}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.confirmBtn, (loading || insufficient) && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={loading || insufficient}
          >
            {loading ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.confirmText}>Boost with {amount} MC</Text>}
          </TouchableOpacity>
          <Text style={styles.footer}>Your balance: {balance} MC</Text>
          <TouchableOpacity style={styles.followRow} onPress={() => setFollowCreator((f) => !f)}>
            <View style={[styles.checkbox, followCreator && styles.checkboxChecked]}>{followCreator && <MaterialIcons name="check" size={16} color={colors.white} />}</View>
            <Text style={styles.followText}>Follow creator</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors, insets) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: (insets?.bottom || 0) + spacing.lg, paddingHorizontal: spacing.lg },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginTop: spacing.sm, marginBottom: spacing.md },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
    title: { fontSize: 20, fontWeight: "800", color: colors.text },
    subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg },
    amountSection: { marginBottom: spacing.lg },
    toggleBtn: { marginTop: spacing.md, alignSelf: "center" },
    toggleText: { fontSize: 14, color: colors.primary, fontWeight: "600" },
    confirmBtn: { backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radii.button, alignItems: "center" },
    confirmBtnDisabled: { opacity: 0.6 },
    confirmText: { fontSize: 16, fontWeight: "700", color: colors.white },
    footer: { fontSize: 14, color: colors.textMuted, textAlign: "center", marginTop: spacing.md },
    followRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm, gap: spacing.sm },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, justifyContent: "center", alignItems: "center" },
    checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
    followText: { fontSize: 15, fontWeight: "600", color: colors.text },
    disabledText: { fontSize: 16, color: colors.textMuted, textAlign: "center", marginBottom: spacing.lg },
    closeBtn: { backgroundColor: colors.surfaceLight, paddingVertical: spacing.md, borderRadius: radii.button, alignItems: "center" },
    closeBtnText: { fontSize: 16, fontWeight: "700", color: colors.text },
  });
}
