/**
 * WalletHomeScreen — MedCoins balance, Earnings tab, quick actions.
 * Medanya dark theme: rounded cards, blue accents.
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../../theme/useThemeColors";
import { radii, shadows, layout } from "../../../theme/designSystem";
import { spacing } from "../../../theme/spacing";
import { useWalletStore } from "../wallet.store";

const QUICK_ACTIONS = [
  { id: "recharge", icon: "add-circle", title: "Recharge MedCoins", screen: "Recharge" },
  { id: "earn", icon: "stars", title: "Earn MedCoins", screen: "EarnCoins" },
  { id: "referral", icon: "people", title: "Invite & Earn", screen: "Referral" },
];

export default function WalletHomeScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const {
    coinBalance,
    earningsBalance,
    pendingBalance,
    withdrawnBalance,
    loading,
    error,
    fetchWallet,
    fetchHistory,
  } = useWalletStore();

  const [activeTab, setActiveTab] = useState("medcoins");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    await Promise.all([fetchWallet(), fetchHistory({ page: 1, limit: 20 })]);
  }, [fetchWallet, fetchHistory]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading && coinBalance === 0 && earningsBalance === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wallet</Text>
        <TouchableOpacity onPress={() => navigation.navigate("WalletHistory")} style={styles.historyBtn}>
          <MaterialIcons name="history" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>MedCoins</Text>
          <Text style={styles.balanceValue}>{coinBalance?.toLocaleString?.() ?? coinBalance ?? 0} MC</Text>
          <Text style={styles.balanceHint}>Use to Boost creators & send Gifts</Text>
          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.ctaPrimary}
              onPress={() => navigation.navigate("Recharge")}
            >
              <Text style={styles.ctaPrimaryText}>Recharge</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaSecondary}
              onPress={() => navigation.navigate("EarnCoins")}
            >
              <Text style={styles.ctaSecondaryText}>Earn Coins</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabToggle}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "medcoins" && styles.tabActive]}
            onPress={() => setActiveTab("medcoins")}
          >
            <Text style={[styles.tabText, activeTab === "medcoins" && styles.tabTextActive]}>
              MedCoins
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "earnings" && styles.tabActive]}
            onPress={() => setActiveTab("earnings")}
          >
            <Text style={[styles.tabText, activeTab === "earnings" && styles.tabTextActive]}>
              Earnings
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "medcoins" ? (
          <View style={styles.quickActions}>
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={styles.actionCard}
                onPress={() => navigation.navigate(a.screen)}
                activeOpacity={0.8}
              >
                <MaterialIcons name={a.icon} size={24} color={colors.primary} />
                <Text style={styles.actionTitle}>{a.title}</Text>
                <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.earningsSection}>
            <View style={styles.earningsCard}>
              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>Available</Text>
                <Text style={styles.earningsValue}>{earningsBalance ?? 0} MC</Text>
              </View>
              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>Pending</Text>
                <Text style={styles.earningsValue}>{pendingBalance ?? 0} MC</Text>
              </View>
              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>Withdrawn</Text>
                <Text style={styles.earningsValue}>{withdrawnBalance ?? 0} MC</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.withdrawBtn}
              onPress={() => navigation.navigate("Withdraw")}
            >
              <Text style={styles.withdrawBtnText}>Withdraw</Text>
            </TouchableOpacity>
            <View style={styles.rulesCard}>
              <Text style={styles.rulesTitle}>Withdrawal rules</Text>
              <Text style={styles.rulesText}>• Min threshold: 500 MC</Text>
              <Text style={styles.rulesText}>• Weekly cadence • Large payouts may take longer</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: layout.screenPadding,
      paddingVertical: spacing.md,
    },
    headerTitle: { fontSize: 22, fontWeight: "800", color: colors.text },
    historyBtn: { padding: spacing.sm },
    errorBanner: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.error + "20",
      padding: spacing.md,
      marginHorizontal: layout.screenPadding,
      marginBottom: spacing.md,
      borderRadius: radii.input,
    },
    errorText: { fontSize: 14, color: colors.error, flex: 1 },
    retryText: { fontSize: 14, fontWeight: "700", color: colors.primary },
    scroll: { flex: 1 },
    scrollContent: { padding: layout.screenPadding, paddingBottom: spacing.xxl },
    balanceCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.card,
      padding: layout.cardPadding,
      marginBottom: layout.sectionGap,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.neoSoft,
    },
    balanceLabel: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
    balanceValue: { fontSize: 36, fontWeight: "800", color: colors.primary },
    balanceHint: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
    ctaRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
    ctaPrimary: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: radii.button,
      alignItems: "center",
    },
    ctaPrimaryText: { fontSize: 16, fontWeight: "700", color: colors.white },
    ctaSecondary: {
      flex: 1,
      backgroundColor: colors.surfaceLight,
      paddingVertical: spacing.md,
      borderRadius: radii.button,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    ctaSecondaryText: { fontSize: 16, fontWeight: "700", color: colors.text },
    tabToggle: {
      flexDirection: "row",
      backgroundColor: colors.surfaceLight,
      borderRadius: radii.input,
      padding: 4,
      marginBottom: layout.sectionGap,
    },
    tab: { flex: 1, paddingVertical: spacing.sm, alignItems: "center", borderRadius: radii.input - 4 },
    tabActive: { backgroundColor: colors.primary },
    tabText: { fontSize: 15, fontWeight: "700", color: colors.textSecondary },
    tabTextActive: { color: colors.white },
    quickActions: { gap: spacing.md },
    actionCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: radii.card,
      padding: layout.cardPadding,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md,
    },
    actionTitle: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
    earningsSection: { gap: spacing.md },
    earningsCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.card,
      padding: layout.cardPadding,
      borderWidth: 1,
      borderColor: colors.border,
    },
    earningsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    earningsLabel: { fontSize: 15, color: colors.textSecondary },
    earningsValue: { fontSize: 16, fontWeight: "700", color: colors.text },
    withdrawBtn: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: radii.button,
      alignItems: "center",
    },
    withdrawBtnText: { fontSize: 16, fontWeight: "700", color: colors.white },
    rulesCard: {
      backgroundColor: colors.surfaceLight,
      borderRadius: radii.input,
      padding: layout.cardPadding,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rulesTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    rulesText: { fontSize: 13, color: colors.textMuted, lineHeight: 22 },
  });
}
