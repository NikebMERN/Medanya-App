import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import SubScreenHeader from "../../components/SubScreenHeader";
import * as payoutsApi from "../../api/payouts.api";

const STATUS_LABELS = {
  NOT_STARTED: "Not started",
  PENDING: "Pending – complete setup in Stripe",
  COMPLETE: "Complete",
};

export default function PayoutSetupScreen({ navigation }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onboardLoading, setOnboardLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const data = await payoutsApi.getConnectStatus();
      setStatus({
        onboardingStatus: data.onboardingStatus ?? data.stripe_onboarding_status ?? "NOT_STARTED",
        payoutsEnabled: data.payoutsEnabled ?? data.stripe_payouts_enabled ?? data.canAcceptPayouts ?? false,
        chargesEnabled: data.chargesEnabled ?? data.stripe_charges_enabled ?? false,
        detailsSubmitted: data.detailsSubmitted ?? data.stripe_details_submitted ?? false,
      });
    } catch (_) {
      setStatus({ onboardingStatus: "NOT_STARTED", payoutsEnabled: false, chargesEnabled: false, detailsSubmitted: false });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStatus();
  }, [loadStatus]);

  React.useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleSetUpPayouts = async () => {
    setOnboardLoading(true);
    try {
      const url = await payoutsApi.getConnectOnboardUrl();
      if (url) {
        await WebBrowser.openBrowserAsync(url, { createTask: false });
        loadStatus();
      } else {
        setStatus((s) => ({ ...s, onboardingStatus: "NOT_STARTED" }));
      }
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.message || "Could not open payout setup.";
      Alert.alert("Setup failed", msg);
    } finally {
      setOnboardLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const onboardingStatus = status?.onboardingStatus ?? "NOT_STARTED";
  const payoutsEnabled = status?.payoutsEnabled ?? false;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <SubScreenHeader title="Payout setup" onBack={() => navigation.goBack()} showProfileDropdown={false} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.card}>
          <MaterialIcons name="account-balance" size={48} color={colors.primary} style={styles.icon} />
          <Text style={styles.title}>Seller payouts</Text>
          <Text style={styles.subtitle} numberOfLines={4}>
            Connect your bank account securely via Stripe. You will receive payouts after delivery is confirmed.
          </Text>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status:</Text>
            <View style={[styles.statusBadge, payoutsEnabled && styles.statusBadgeSuccess]}>
              <Text style={[styles.statusBadgeText, payoutsEnabled && styles.statusBadgeTextSuccess]} numberOfLines={1}>
                {payoutsEnabled ? "Payouts Enabled ✓" : STATUS_LABELS[onboardingStatus] || onboardingStatus}
              </Text>
            </View>
          </View>

          {!payoutsEnabled && (
            <TouchableOpacity
              style={[styles.btn, onboardLoading && styles.btnDisabled]}
              onPress={handleSetUpPayouts}
              disabled={onboardLoading}
            >
              {onboardLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="link" size={20} color="#fff" style={styles.btnIcon} />
                  <Text style={styles.btnText}>Set up payouts</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {payoutsEnabled && (
            <View style={styles.successRow}>
              <MaterialIcons name="check-circle" size={24} color={colors.success || "#2e7d32"} style={styles.successIcon} />
              <Text style={styles.successText} numberOfLines={3}>
                Your bank account is connected. You can accept card orders.
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.hint} numberOfLines={4}>
          Stripe handles KYC and bank details securely. We never collect or store your bank account numbers.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg },
    scroll: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.xl,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    icon: { marginBottom: spacing.md },
    title: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    subtitle: { fontSize: 14, color: colors.textMuted, lineHeight: 22, marginBottom: spacing.lg, flexShrink: 1 },
    statusRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg, flexWrap: "wrap" },
    statusLabel: { fontSize: 14, color: colors.textMuted, marginRight: spacing.sm },
    statusBadge: {
      flexShrink: 1,
      alignSelf: "flex-start",
      backgroundColor: colors.surfaceLight || "#f5f5f5",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 8,
      maxWidth: "100%",
    },
    statusBadgeSuccess: { backgroundColor: `${colors.success || "#2e7d32"}20` },
    statusBadgeText: { fontSize: 14, fontWeight: "600", color: colors.text, flexShrink: 1 },
    statusBadgeTextSuccess: { color: colors.success || "#2e7d32" },
    btn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: 12,
    },
    btnDisabled: { opacity: 0.7 },
    btnIcon: { marginRight: spacing.sm },
    btnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
    successRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, flexShrink: 1 },
    successIcon: { marginTop: 2 },
    successText: { fontSize: 14, color: colors.success || "#2e7d32", flex: 1, flexShrink: 1 },
    hint: { fontSize: 12, color: colors.textMuted, lineHeight: 18, flexShrink: 1 },
  });
}
