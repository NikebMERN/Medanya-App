import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { spacing } from "../theme/spacing";

const MIN = 1;
const MAX = 99999;

export default function SupportCreatorSheet({ visible, onClose, creatorId, creatorName, context = "VIDEO", contextId, onSuccess }) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = createStyles(colors, insets);

  const [manualMode, setManualMode] = useState(false);
  const [amount, setAmount] = useState(100);
  const [loading, setLoading] = useState(false);

  const triggerHaptic = useCallback(() => {
    try {
      const H = require("expo-haptics");
      H.selectionAsync?.();
    } catch (_) {}
  }, []);

  const adjustAmount = useCallback((delta) => {
    triggerHaptic();
    setAmount((prev) => Math.min(MAX, Math.max(MIN, prev + delta)));
  }, [triggerHaptic]);

  const handleConfirm = useCallback(async () => {
    if (!creatorId || amount < MIN) return;
    setLoading(true);
    try {
      const client = (await import("../api/client")).default;
      const { data } = await client.post("/wallet/support", {
        creatorId,
        amount,
        context,
        contextId: contextId || null,
      });
      onSuccess?.(data);
      onClose?.();
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.message || "Failed to send support";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  }, [creatorId, amount, context, contextId, onSuccess, onClose]);

  const displayAmount = manualMode ? String(amount) : amount;
  const setDisplayAmount = (v) => {
    const n = parseInt(String(v).replace(/\D/g, ""), 10);
    if (!isNaN(n)) setAmount(Math.min(MAX, Math.max(MIN, n)));
    else if (v === "") setAmount(MIN);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Support {creatorName || "Creator"}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {manualMode ? (
            <View style={styles.inputSection}>
              <Text style={styles.label}>Amount (coins)</Text>
              <TextInput
                style={styles.input}
                value={displayAmount}
                onChangeText={setDisplayAmount}
                keyboardType="number-pad"
                maxLength={5}
                placeholder="1 - 99999"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          ) : (
            <View style={styles.rulerSection}>
              <Text style={styles.label}>Amount (coins)</Text>
              <View style={styles.rulerRow}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => adjustAmount(-10)}>
                  <MaterialIcons name="remove" size={24} color={colors.primary} />
                </TouchableOpacity>
                <View style={styles.amountDisplay}>
                  <Text style={styles.amountText}>{amount}</Text>
                </View>
                <TouchableOpacity style={styles.stepBtn} onPress={() => adjustAmount(10)}>
                  <MaterialIcons name="add" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.quickRow}>
                {[50, 100, 500, 1000].map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.quickBtn, amount === v && styles.quickBtnActive]}
                    onPress={() => {
                      triggerHaptic();
                      setAmount(v);
                    }}
                  >
                    <Text style={[styles.quickText, amount === v && styles.quickTextActive]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => {
              triggerHaptic();
              setManualMode((m) => !m);
            }}
          >
            <Text style={styles.toggleText}>{manualMode ? "Use quick select" : "Enter amount manually"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.confirmText}>Confirm — {amount} coins</Text>
            )}
          </TouchableOpacity>
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
      paddingBottom: (insets?.bottom || 0) + spacing.lg,
      paddingHorizontal: spacing.lg,
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
      marginBottom: spacing.lg,
    },
    title: { fontSize: 18, fontWeight: "700", color: colors.text },
    label: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.sm },
    inputSection: { marginBottom: spacing.md },
    input: {
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      padding: spacing.md,
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rulerSection: { marginBottom: spacing.md },
    rulerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.lg,
    },
    stepBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surfaceLight,
      justifyContent: "center",
      alignItems: "center",
    },
    amountDisplay: {
      minWidth: 80,
      alignItems: "center",
    },
    amountText: { fontSize: 28, fontWeight: "800", color: colors.primary },
    quickRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    quickBtn: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 10,
      backgroundColor: colors.surfaceLight,
    },
    quickBtnActive: { backgroundColor: colors.primary + "30" },
    quickText: { fontSize: 14, fontWeight: "600", color: colors.text },
    quickTextActive: { color: colors.primary },
    toggleBtn: { marginBottom: spacing.lg, alignSelf: "center" },
    toggleText: { fontSize: 14, color: colors.primary, fontWeight: "600" },
    confirmBtn: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: "center",
    },
    confirmBtnDisabled: { opacity: 0.7 },
    confirmText: { fontSize: 16, fontWeight: "700", color: colors.white },
  });
}
