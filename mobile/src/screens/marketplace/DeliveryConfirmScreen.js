import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { CameraView } from "expo-camera";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import SubScreenHeader from "../../components/SubScreenHeader";
import * as ordersApi from "../../services/orders.api";
import { normalizePlaceholder } from "../../components/ui/Input";
import { inputStyleAndroid } from "../../theme/inputStyles";

export default function DeliveryConfirmScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const orderId = route.params?.orderId;
  const [mode, setMode] = useState("code"); // "code" | "scan"
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  const handleSubmitCode = async () => {
    const c = String(code || "").trim();
    if (c.length !== 7 && !/^\d{7}$/.test(c)) {
      Alert.alert("Invalid code", "Enter the 7-digit delivery code from the buyer.");
      return;
    }
    if (c.length === 7 && /^\d{7}$/.test(c)) {
      setLoading(true);
      try {
        await ordersApi.confirmDelivery(orderId, c);
        Alert.alert("Success", "Delivery confirmed. Order completed.", [
          { text: "OK", onPress: () => navigation.replace("OrderStatus", { orderId }) },
        ]);
      } catch (e) {
        const msg = e?.response?.data?.error?.message || e?.message || "Invalid code";
        Alert.alert("Error", msg);
      } finally {
        setLoading(false);
      }
      return;
    }
    Alert.alert("Invalid code", "Enter the 7-digit delivery code from the buyer.");
  };

  const handleBarcodeScanned = useCallback(
    async ({ data }) => {
      if (scanning) return;
      setScanning(true);
      try {
        await ordersApi.confirmDeliveryByQr(orderId, data);
        Alert.alert("Success", "Delivery confirmed via QR. Order completed.", [
          { text: "OK", onPress: () => navigation.replace("OrderStatus", { orderId }) },
        ]);
      } catch (e) {
        Alert.alert("Error", e?.response?.data?.error?.message ?? e?.message ?? "Invalid QR");
        setScanning(false);
      }
    },
    [orderId, navigation, scanning]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SubScreenHeader title="Confirm delivery" onBack={() => navigation.goBack()} showProfileDropdown navigation={navigation?.getParent?.() ?? navigation} />
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, mode === "code" && styles.tabActive]}
          onPress={() => setMode("code")}
        >
          <Text style={[styles.tabText, mode === "code" && styles.tabTextActive]}>Enter code</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mode === "scan" && styles.tabActive]}
          onPress={() => setMode("scan")}
        >
          <Text style={[styles.tabText, mode === "scan" && styles.tabTextActive]}>Scan QR</Text>
        </TouchableOpacity>
      </View>

      {mode === "code" ? (
        <View style={styles.content}>
          <Text style={styles.instruction}>
            Ask the buyer for their 7-digit delivery code. Enter it below to complete the order.
          </Text>
          <TextInput
            style={[styles.input, inputStyleAndroid]}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 7))}
            placeholder={normalizePlaceholder("0000000")}
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={7}
          />
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmitCode}
            disabled={loading || code.length !== 7}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.btnText}>Confirm</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.scanContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanning ? undefined : handleBarcodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr", "org.iso.QRCode"] }}
          />
          <View style={styles.scanOverlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scanHint}>Align buyer's QR code within the frame</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    tabs: { flexDirection: "row", paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
    tab: { flex: 1, paddingVertical: spacing.md, alignItems: "center", borderRadius: 12, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border },
    tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabText: { fontSize: 15, fontWeight: "700", color: colors.textSecondary },
    tabTextActive: { color: colors.white },
    content: { flex: 1, padding: spacing.lg },
    scanContainer: { flex: 1, position: "relative" },
    camera: { flex: 1 },
    scanOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
    scanFrame: { width: 200, height: 200, borderWidth: 2, borderColor: colors.primary, borderRadius: 12, backgroundColor: "transparent" },
    scanHint: { color: colors.white, fontSize: 14, marginTop: spacing.lg, textShadowColor: "#000", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },
    instruction: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
      lineHeight: 24,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      padding: spacing.lg,
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      letterSpacing: 8,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    btn: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: "center",
    },
    btnDisabled: { opacity: 0.7 },
    btnText: { fontSize: 16, fontWeight: "700", color: colors.white },
  });
}
