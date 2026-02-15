/**
 * Modal: Report listing, Report user, Block user.
 */
import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
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
  onBlocked,
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [loading, setLoading] = React.useState(false);

  const handleReportListing = () => {
    onClose();
    // Navigate to report form or inline report
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

  const handleReportUser = () => {
    if (!targetUserId) return;
    onClose();
    Alert.alert("Report user", "Report this user?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            await reportsApi.createListingReport({
              targetType: "user",
              targetId: String(targetUserId),
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
    ]);
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

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.option}
            onPress={handleReportListing}
            disabled={loading}
          >
            <MaterialIcons name="flag" size={22} color={colors.text} />
            <Text style={styles.optionText}>Report listing</Text>
          </TouchableOpacity>
          {targetUserId && (
            <>
              <TouchableOpacity
                style={styles.option}
                onPress={handleReportUser}
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
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    optionDanger: {},
    optionText: { fontSize: 16, color: colors.text },
    cancelBtn: { marginTop: spacing.sm, paddingVertical: spacing.sm },
    cancelText: { fontSize: 16, color: colors.textMuted, textAlign: "center" },
  });
}
