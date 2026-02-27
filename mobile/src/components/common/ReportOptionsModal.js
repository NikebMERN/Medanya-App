/**
 * Modal: Report listing, Report user (with full form), Block user.
 */
import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import * as reportsApi from "../../services/reports.api";
import * as userApi from "../../api/user.api";

export default function ReportOptionsModal({
  visible,
  onClose,
  targetType,
  targetId,
  targetUserId,
  contextSourceUrl = "",
  onBlocked,
  onReportListingPress,
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [loading, setLoading] = useState(false);
  const [showReportUserForm, setShowReportUserForm] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [contextUrl, setContextUrl] = useState(contextSourceUrl || "");
  const [description, setDescription] = useState("");

  const resetReportForm = () => {
    setShowReportUserForm(false);
    setSelectedReason("");
    setCustomReason("");
    setContextUrl(contextSourceUrl || "");
    setDescription("");
  };

  const handleClose = () => {
    resetReportForm();
    onClose();
  };

  const handleReportListing = () => {
    if (onReportListingPress) {
      onClose();
      onReportListingPress();
      return;
    }
    onClose();
    Alert.alert(
      "Report",
      "Report this " + (targetType === "job" ? "job" : "listing") + "?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await reportsApi.createListingReport({
                targetType,
                targetId: String(targetId),
                reason: "other",
                description: "Reported from detail screen",
              });
              Alert.alert("Reported", "Thank you. We will review this.");
            } catch (e) {
              Alert.alert("Error", e?.response?.data?.error?.message || e?.message || "Failed");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReportUserPress = () => {
    if (!targetUserId) return;
    setShowReportUserForm(true);
  };

  const handleReportUserSubmit = async () => {
    if (!targetUserId) return;
    const reason = selectedReason || "other";
    if (reason === "other" && !customReason.trim()) {
      Alert.alert("Required", "Please describe the reason when selecting 'Other'.");
      return;
    }
    setLoading(true);
    try {
      await reportsApi.reportUser({
        targetUserId: String(targetUserId),
        reason,
        customReason: reason === "other" ? customReason.trim() : "",
        description: description.trim() || "",
        contextSourceUrl: contextUrl.trim() || "",
      });
      resetReportForm();
      onClose();
      Alert.alert("Reported", "Thank you. We will review this.");
    } catch (e) {
      const msg =
        e?.response?.data?.error?.message ||
        e?.message ||
        "Failed to submit report.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = () => {
    if (!targetUserId) return;
    Alert.alert(
      "Block user",
      "Block this user? You won't see their listings or messages.",
      [
        { text: "Cancel", style: "cancel", onPress: onClose },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await userApi.blockUser(targetUserId);
              onBlocked?.();
              onClose();
              Alert.alert("Blocked", "User has been blocked.");
            } catch (e) {
              Alert.alert("Error", e?.response?.data?.error?.message || e?.message || "Failed");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const needsCustomReason = selectedReason === "other";
  const needsContextUrl =
    selectedReason === "video_content" || selectedReason === "livestream_content";

  const reportUserForm = (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.formContainer}
    >
      <TouchableOpacity
        style={styles.backRow}
        onPress={() => setShowReportUserForm(false)}
      >
        <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
      </TouchableOpacity>
      <Text style={[styles.formTitle, { color: colors.text }]}>Report user</Text>
      <Text style={[styles.formSubtitle, { color: colors.textMuted }]}>
        Select a reason. Admin will see your report and context.
      </Text>

      <ScrollView style={styles.reasonsList} showsVerticalScrollIndicator={false}>
        {reportsApi.USER_REPORT_REASONS.map((r) => (
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

      {needsCustomReason && (
        <View style={styles.inputRow}>
          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
            Please describe the reason
          </Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            placeholder="Describe what happened..."
            placeholderTextColor={colors.textMuted}
            value={customReason}
            onChangeText={setCustomReason}
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      {needsContextUrl && (
        <View style={styles.inputRow}>
          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
            Link to video or livestream (optional)
          </Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            placeholder="https://..."
            placeholderTextColor={colors.textMuted}
            value={contextUrl}
            onChangeText={setContextUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>
      )}

      {!needsContextUrl && (contextSourceUrl || contextUrl) ? (
        <View style={styles.inputRow}>
          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
            Link to video/livestream (optional)
          </Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            placeholder="https://..."
            placeholderTextColor={colors.textMuted}
            value={contextUrl || contextSourceUrl}
            onChangeText={setContextUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
          Additional details (optional)
        </Text>
        <TextInput
          style={[styles.input, styles.inputMultiline, { color: colors.text, borderColor: colors.border }]}
          placeholder="Any extra context..."
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={2}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.error || "#ef4444" }]}
        onPress={handleReportUserSubmit}
        disabled={loading || (selectedReason === "other" && !customReason.trim())}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Submit report</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );

  const optionsView = (
    <>
      <TouchableOpacity style={styles.option} onPress={handleReportListing} disabled={loading}>
        <MaterialIcons name="flag" size={22} color={colors.text} />
        <Text style={styles.optionText}>Report listing</Text>
      </TouchableOpacity>
      {targetUserId && (
        <>
          <TouchableOpacity
            style={styles.option}
            onPress={handleReportUserPress}
            disabled={loading}
          >
            <MaterialIcons name="report-problem" size={22} color={colors.text} />
            <Text style={styles.optionText}>Report user</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.option, styles.optionDanger]}
            onPress={handleBlockUser}
            disabled={loading}
          >
            <MaterialIcons name="block" size={22} color={colors.error} />
            <Text style={[styles.optionText, { color: colors.error }]}>Block user</Text>
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[styles.content, showReportUserForm && styles.contentForm]}
          onPress={(e) => e.stopPropagation?.()}
        >
          {showReportUserForm ? reportUserForm : optionsView}
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
    contentForm: {
      minHeight: "70%",
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    optionText: { fontSize: 16, color: colors.text },
    optionDanger: {},
    cancelBtn: { marginTop: spacing.sm, paddingVertical: spacing.sm },
    cancelText: { fontSize: 16, color: colors.textMuted, textAlign: "center" },
    formContainer: { flex: 1 },
    backRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    backText: { fontSize: 16, fontWeight: "600" },
    formTitle: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
    formSubtitle: { fontSize: 13, marginBottom: spacing.md },
    reasonsList: { maxHeight: 180, marginBottom: spacing.md },
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
    inputRow: { marginBottom: spacing.md },
    inputLabel: { fontSize: 12, marginBottom: 4 },
    input: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 15,
    },
    inputMultiline: { minHeight: 60 },
    submitBtn: {
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: "center",
      marginTop: spacing.sm,
    },
    submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  });
}
