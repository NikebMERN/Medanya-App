import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import SubScreenHeader from "../../components/SubScreenHeader";
import * as walletApi from "../../services/wallet.api";

const TX_LABELS = {
  credit: "Recharged",
  debit: "Spent",
  earn: "Earned",
  commission: "Commission",
  gift_spend: "Gift sent",
  gift_earn: "Gift received",
  gift_commission: "Gift commission",
};

export default function WalletScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const w = await walletApi.getMyWallet();
      setWallet(w?.wallet ?? w);
      const tx = await walletApi.getTransactions({ page: 1, limit: 50 });
      setTransactions(tx?.transactions ?? []);
    } catch (_) {
      setWallet(null);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const balance = wallet?.balance ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SubScreenHeader
        title="Wallet"
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity onPress={() => navigation.navigate("Recharge")}>
            <MaterialIcons name="add-circle" size={28} color={colors.primary} />
          </TouchableOpacity>
        }
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text style={styles.balanceValue}>{balance} coins</Text>
            <TouchableOpacity
              style={styles.rechargeBtn}
              onPress={() => navigation.navigate("Recharge")}
            >
              <Text style={styles.rechargeBtnText}>Recharge</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionLabel}>Recent transactions</Text>
          <FlatList
            data={transactions}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.txRow}>
                <View style={styles.txLeft}>
                  <Text style={styles.txType}>{TX_LABELS[item.type] || item.type}</Text>
                  <Text style={styles.txDate}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}
                  </Text>
                </View>
                <Text style={[styles.txAmount, item.amount >= 0 ? styles.txPositive : styles.txNegative]}>
                  {item.amount >= 0 ? "+" : ""}{item.amount}
                </Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No transactions yet</Text>}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    content: { flex: 1, padding: spacing.lg },
    balanceCard: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    balanceLabel: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 4 },
    balanceValue: { fontSize: 32, fontWeight: "800", color: colors.white, marginBottom: spacing.md },
    rechargeBtn: {
      alignSelf: "flex-start",
      backgroundColor: "rgba(255,255,255,0.25)",
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: 10,
    },
    rechargeBtnText: { fontSize: 14, fontWeight: "700", color: colors.white },
    sectionLabel: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    listContent: { paddingBottom: spacing.xxl },
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
    empty: { fontSize: 14, color: colors.textMuted, textAlign: "center", paddingVertical: spacing.xl },
  });
}
