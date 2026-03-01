/**
 * DeliveryCodeSection — Buyer: hidden code, reveal with warning, optional biometric.
 * QR handover option: token displayed; plug react-native-qrcode-svg for QR render.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { radii } from "../../theme/designSystem";
import { spacing } from "../../theme/spacing";
import * as ordersApi from "../../services/orders.api";

export default function DeliveryCodeSection({ orderId, orderStatus }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [code, setCode] = useState(null);
  const [qrToken, setQrToken] = useState(null);
  const [revealLoading, setRevealLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [warningModalVisible, setWarningModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // "reveal" | "qr"

  const canReveal = ["SHIPPED", "AUTHORIZED", "COD_SELECTED", "DELIVERED_PENDING_CODE"].includes(orderStatus);

  const tryBiometric = async () => {
    try {
      const auth = require("expo-local-authentication");
      const { success } = await auth.authenticateAsync({
        promptMessage: "Verify identity to reveal delivery code",
        fallbackLabel: "Use PIN",
      });
      return success;
    } catch (_) {
      return true; // skip if expo-local-authentication not installed
    }
  };

  const handleRevealPress = () => {
    if (code) return; // already revealed
    setPendingAction("reveal");
    setWarningModalVisible(true);
  };

  const handleQrPress = () => {
    setPendingAction("qr");
    setWarningModalVisible(true);
  };

  const onWarningConfirm = async () => {
    setWarningModalVisible(false);
    if (pendingAction === "reveal") {
      setRevealLoading(true);
      try {
        const ok = await tryBiometric();
        if (ok) {
          const c = await ordersApi.getDeliveryCode(orderId);
          setCode(c ?? "------");
        }
      } catch (e) {
        Alert.alert("Error", e?.response?.data?.error?.message ?? e?.message ?? "Failed to load code");
      } finally {
        setRevealLoading(false);
      }
    } else if (pendingAction === "qr") {
      setQrLoading(true);
      try {
        const token = await ordersApi.getDeliveryQrToken(orderId);
        setQrToken(token ?? "NO_TOKEN");
      } catch (e) {
        Alert.alert("Error", e?.response?.data?.error?.message ?? e?.message ?? "Failed to load QR");
      } finally {
        setQrLoading(false);
      }
    }
    setPendingAction(null);
  };

  const copyCode = () => {
    if (code) Clipboard.setString(code);
  };

  const copyToken = () => {
    if (qrToken) Clipboard.setString(qrToken);
  };

  if (!canReveal) return null;

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Delivery code</Text>
        <Text style={styles.hint}>Only reveal when you are receiving the item in person.</Text>
        <View style={styles.codeRow}>
          <Text style={styles.codeValue}>{code ?? "•••••••"}</Text>
          <TouchableOpacity
            style={[styles.revealBtn, code && styles.revealBtnDisabled]}
            onPress={handleRevealPress}
            disabled={!!code || revealLoading}
          >
            {revealLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.revealBtnText}>{code ? "Revealed" : "Reveal"}</Text>
            )}
          </TouchableOpacity>
        </View>
        {code ? (
          <TouchableOpacity style={styles.copyBtn} onPress={copyCode}>
            <MaterialIcons name="content-copy" size={18} color={colors.primary} />
            <Text style={styles.copyText}>Copy</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>QR handover</Text>
        <Text style={styles.hint}>Seller can scan this to confirm delivery (no need to read code aloud).</Text>
        <TouchableOpacity
          style={[styles.qrBtn, qrToken && styles.qrBtnDisabled]}
          onPress={handleQrPress}
          disabled={!!qrToken || qrLoading}
        >
          {qrLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : qrToken ? (
            <View style={styles.qrPlaceholder}>
              <MaterialIcons name="qr-code-2" size={64} color={colors.primary} />
              <Text style={styles.qrTokenText} numberOfLines={2}>{qrToken}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={copyToken}>
                <Text style={styles.copyText}>Copy token</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.qrBtnText}>Show QR</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={warningModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setWarningModalVisible(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <MaterialIcons name="warning" size={48} color={colors.warning} />
            <Text style={styles.modalTitle}>Confirm</Text>
            <Text style={styles.modalText}>
              Only reveal when you are receiving the item in person. Do not share over chat.
            </Text>
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setWarningModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={onWarningConfirm}>
                <Text style={styles.modalConfirmText}>I understand</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.card,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    hint: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md, lineHeight: 20 },
    codeRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    codeValue: { fontSize: 24, fontWeight: "800", letterSpacing: 4, color: colors.text },
    revealBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radii.button, backgroundColor: colors.primary },
    revealBtnDisabled: { opacity: 0.6, backgroundColor: colors.surfaceLight },
    revealBtnText: { fontSize: 14, fontWeight: "700", color: colors.white },
    copyBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
    copyText: { fontSize: 14, fontWeight: "600", color: colors.primary },
    qrBtn: { paddingVertical: spacing.lg, alignItems: "center", borderRadius: radii.input, borderWidth: 2, borderColor: colors.border, borderStyle: "dashed" },
    qrBtnDisabled: { borderStyle: "solid", borderColor: colors.primary },
    qrBtnText: { fontSize: 16, fontWeight: "700", color: colors.primary },
    qrPlaceholder: { alignItems: "center" },
    qrTokenText: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, maxWidth: 200 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: spacing.lg },
    modalBox: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.xl, alignItems: "center", maxWidth: 320 },
    modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: spacing.md },
    modalText: { fontSize: 15, color: colors.textSecondary, textAlign: "center", marginTop: spacing.sm, lineHeight: 22 },
    modalRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl },
    modalCancel: { flex: 1, paddingVertical: spacing.md, borderRadius: radii.button, backgroundColor: colors.surfaceLight, alignItems: "center" },
    modalCancelText: { fontSize: 16, fontWeight: "600", color: colors.text },
    modalConfirm: { flex: 1, paddingVertical: spacing.md, borderRadius: radii.button, backgroundColor: colors.primary, alignItems: "center" },
    modalConfirmText: { fontSize: 16, fontWeight: "700", color: colors.white },
  });
}
