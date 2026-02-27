/**
 * Rules modal before chat/call. Uses AsyncStorage key "safety_warn_YYYY-MM-DD" to show once per day.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { spacing } from "../theme/spacing";

const RULES = [
  "Never pay upfront",
  "Meet in public",
  "Don't share ID or passport",
  "Use in-app chat as evidence",
];

function todayKey() {
  const d = new Date();
  return `safety_warn_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SafetyWarningModal({
  visible,
  onAcknowledge,
  onClose,
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        const key = todayKey();
        const val = await AsyncStorage.getItem(key);
        if (!cancelled && val === "1") {
          onAcknowledge?.();
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [visible, onAcknowledge]);

  const handleConfirm = useCallback(async () => {
    setLoading(true);
    try {
      await AsyncStorage.setItem(todayKey(), "1");
      onAcknowledge?.();
    } catch (_) {
      onAcknowledge?.();
    } finally {
      setLoading(false);
    }
  }, [onAcknowledge]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="shield" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title}>Stay Safe</Text>
          <Text style={styles.subtitle}>Please read before continuing:</Text>
          <ScrollView style={styles.rules} showsVerticalScrollIndicator={false}>
            {RULES.map((rule, i) => (
              <View key={i} style={styles.ruleRow}>
                <MaterialIcons name="check-circle" size={20} color={colors.success} />
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.btnPrimaryText}>I understand</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={onClose}>
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.lg,
    },
    content: {
      width: "100%",
      maxWidth: 360,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.lg,
      alignItems: "center",
    },
    iconWrap: { marginBottom: spacing.md },
    title: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
    subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.md },
    rules: { width: "100%", maxHeight: 160, marginBottom: spacing.lg },
    ruleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
    ruleText: { fontSize: 15, color: colors.text },
    actions: { width: "100%", gap: spacing.sm },
    btn: { paddingVertical: spacing.md, borderRadius: 12, alignItems: "center", width: "100%" },
    btnPrimary: { backgroundColor: colors.primary },
    btnPrimaryText: { fontSize: 16, fontWeight: "600", color: colors.white },
    btnSecondary: { paddingVertical: spacing.sm },
    btnSecondaryText: { fontSize: 15, color: colors.textMuted },
  });
}
