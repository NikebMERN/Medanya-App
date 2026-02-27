/**
 * Content report modal: Reason picker (Scam, Deposit request, Passport request, Harassment, Fake item, Other) + description.
 * Calls createUnifiedReport with targetType JOB or MARKET_ITEM.
 */
import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { spacing } from "../theme/spacing";
import * as reportsApi from "../services/reports.api";

export const CONTENT_REPORT_REASONS = reportsApi.CONTENT_REPORT_REASONS;

export default function ContentReportModal({
  visible,
  onClose,
  targetType,
  targetId,
  onReported,
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [loading, setLoading] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [description, setDescription] = useState("");

  const reset = () => {
    setSelectedReason("");
    setDescription("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setLoading(true);
    try {
      await reportsApi.createUnifiedReport({
        targetType: targetType === "marketplace" ? "MARKET_ITEM" : "JOB",
        targetId: String(targetId),
        reason: selectedReason,
        description: description.trim() || "",
      });
      reset();
      onClose();
      Alert.alert("Reported", "Thank you. We will review this.");
      onReported?.();
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.message || "Failed to report.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation?.()}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <Text style={[styles.title, { color: colors.text }]}>Report content</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Why are you reporting this?
            </Text>
            <ScrollView style={styles.reasons} showsVerticalScrollIndicator={false}>
              {CONTENT_REPORT_REASONS.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[
                    styles.reasonBtn,
                    {
                      borderColor: selectedReason === r.value ? colors.primary : colors.border,
                      backgroundColor: selectedReason === r.value ? colors.primary + "15" : "transparent",
                    },
                  ]}
                  onPress={() => setSelectedReason(r.value)}
                >
                  <Text style={[styles.reasonLabel, { color: colors.text }]}>{r.label}</Text>
                  {selectedReason === r.value && (
                    <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
              Additional details (optional)
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Describe what's wrong..."
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
            />
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.error || "#ef4444" }]}
                onPress={handleSubmit}
                disabled={loading || !selectedReason}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Submit report</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    content: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: spacing.lg,
      paddingBottom: spacing.xl + 24,
      maxHeight: "85%",
    },
    title: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
    subtitle: { fontSize: 13, marginBottom: spacing.md },
    reasons: { maxHeight: 200, marginBottom: spacing.md },
    reasonBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: spacing.xs,
    },
    reasonLabel: { fontSize: 15 },
    inputLabel: { fontSize: 12, marginBottom: 4 },
    input: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 15,
      minHeight: 60,
      marginBottom: spacing.md,
    },
    actions: { gap: spacing.sm },
    submitBtn: {
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: "center",
    },
    submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    cancelBtn: { paddingVertical: spacing.sm, alignItems: "center" },
    cancelText: { fontSize: 16 },
  });
}
