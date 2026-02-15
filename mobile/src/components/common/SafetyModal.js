/**
 * Safety warning modal shown once before chat/call.
 * User must confirm; stores safety_acknowledged_at via API.
 */
import React, { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import * as userApi from "../../api/user.api";
import { useAuthStore } from "../../store/auth.store";

const RULES = [
  "Never pay upfront",
  "Meet in public",
  "Don't share ID or passport",
  "Use in-app chat as evidence",
];

export default function SafetyModal({ visible, onAcknowledge, onClose }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await userApi.updateMe({ safetyAcknowledgedAt: true });
      useAuthStore.getState().updateUser({ safety_acknowledged_at: new Date().toISOString() });
      onAcknowledge?.();
    } catch (e) {
      // Still allow proceed if API fails (offline)
      onAcknowledge?.();
    } finally {
      setLoading(false);
    }
  };

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
    btn: { paddingVertical: spacing.md, borderRadius: 12, alignItems: "center" },
    btnPrimary: { backgroundColor: colors.primary },
    btnPrimaryText: { fontSize: 16, fontWeight: "600", color: colors.white },
    btnSecondary: { paddingVertical: spacing.sm },
    btnSecondaryText: { fontSize: 15, color: colors.textMuted },
  });
}
