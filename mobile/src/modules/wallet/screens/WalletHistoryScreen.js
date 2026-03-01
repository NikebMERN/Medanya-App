/**
 * WalletHistoryScreen — Transaction history list.
 */
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../../theme/useThemeColors";
import { radii, layout } from "../../../theme/designSystem";
import { spacing } from "../../../theme/spacing";
import { useWalletStore } from "../wallet.store";

const TX_LABELS = { credit: "Recharged", debit: "Spent", earn: "Earned", commission: "Commission", support: "Boost" };

export default function WalletHistoryScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const { history, loading, fetchHistory } = useWalletStore();
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    await fetchHistory({ page: 1, limit: 50 });
  }, [fetchHistory]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && (!history || history.length === 0) ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={history ?? []}
          keyExtractor={(item) => String(item.id ?? item.created_at ?? Math.random())}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <View style={styles.txRow}>
              <View style={styles.txLeft}>
                <Text style={styles.txType}>{TX_LABELS[item.type] ?? item.type}</Text>
                <Text style={styles.txDate}>
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}
                </Text>
              </View>
              <Text style={[styles.txAmount, item.amount >= 0 ? styles.txPositive : styles.txNegative]}>
                {item.amount >= 0 ? "+" : ""}{item.amount} MC
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="receipt-long" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: layout.screenPadding,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
    listContent: { padding: layout.screenPadding, paddingBottom: spacing.xxl },
    txRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    txLeft: {},
    txType: { fontSize: 16, fontWeight: "600", color: colors.text },
    txDate: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    txAmount: { fontSize: 16, fontWeight: "700" },
    txPositive: { color: colors.success },
    txNegative: { color: colors.text },
    empty: { alignItems: "center", paddingVertical: spacing.xxl },
    emptyText: { fontSize: 16, color: colors.textMuted, marginTop: spacing.md },
  });
}
