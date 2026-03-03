import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import SubScreenHeader from "../../components/SubScreenHeader";
import * as penaltiesApi from "../../services/penalties.api";
import { useStripe } from "@stripe/stripe-react-native";
import { useAuthStore } from "../../store/auth.store";

export default function PenaltyCenterScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const setBannedRedirect = useAuthStore((s) => s.setBannedRedirect);

  const [penalties, setPenalties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payingId, setPayingId] = useState(null);

  const loadPenalties = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const list = await penaltiesApi.listMyPenalties();
      setPenalties(list || []);
      setBannedRedirect?.(false);
    } catch (e) {
      setPenalties([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setBannedRedirect]);

  useEffect(() => {
    loadPenalties();
  }, [loadPenalties]);

  const handlePay = async (penalty) => {
    if (penalty.status !== "UNPAID" || (penalty.fine_amount_cents || 0) <= 0) return;
    setPayingId(penalty.id);
    try {
      const clientSecret = await penaltiesApi.createPaymentIntent(penalty.id);
      if (!clientSecret) throw new Error("No payment intent");
      const { error: initErr } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "Medanya",
      });
      if (initErr) throw initErr;
      const { error: presentErr } = await presentPaymentSheet();
      if (presentErr) {
        if (presentErr.code !== "Canceled") Alert.alert("Error", presentErr.message || "Payment failed");
        return;
      }
      Alert.alert("Success", "Payment successful. Your account has been restored.", [
        { text: "OK", onPress: () => loadPenalties(true) },
      ]);
    } catch (e) {
      Alert.alert("Error", e?.message || "Could not complete payment");
    } finally {
      setPayingId(null);
    }
  };

  const unpaid = penalties.filter((p) => p.status === "UNPAID");
  const paid = penalties.filter((p) => p.status === "PAID");

  return (
    <View style={styles.container}>
      <SubScreenHeader
        title="Penalty Center"
        onBack={() => navigation.goBack()}
        showProfileDropdown
        navigation={navigation?.getParent?.() ?? navigation}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadPenalties(true)} colors={[colors.primary]} />
        }
      >
        <Text style={styles.hint}>View your penalties and restore access by paying fines.</Text>
        {loading && !penalties.length ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : unpaid.length === 0 && paid.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="check-circle" size={48} color={colors.success || "#22c55e"} />
            <Text style={styles.emptyText}>No penalties</Text>
          </View>
        ) : (
          <>
            {unpaid.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Outstanding</Text>
                {unpaid.map((p) => (
                  <View key={p.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <TouchableOpacity onPress={() => {}}>
                        <Text style={styles.levelLabel}>{p.level_label}</Text>
                      </TouchableOpacity>
                      <Text style={styles.reason}>{p.reason_text || p.reason_code}</Text>
                    </View>
                    <Text style={styles.fine}>
                      Fine: {(p.fine_amount_cents / 100).toFixed(2)} AED
                    </Text>
                    {p.ban_until && (
                      <Text style={styles.banUntil}>
                        Ban until: {new Date(p.ban_until).toLocaleDateString()}
                      </Text>
                    )}
                    <TouchableOpacity
                      style={[styles.payBtn, payingId === p.id && styles.payBtnDisabled]}
                      onPress={() => handlePay(p)}
                      disabled={payingId !== null}
                    >
                      {payingId === p.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.payBtnText}>Pay & Restore Access</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            {paid.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Resolved</Text>
                {paid.map((p) => (
                  <View key={p.id} style={[styles.card, styles.cardPaid]}>
                    <Text style={styles.levelLabel}>{p.level_label}</Text>
                    <Text style={styles.reason}>{p.reason_text || p.reason_code}</Text>
                    <Text style={styles.resolved}>Paid</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
    hint: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg },
    section: { marginBottom: spacing.xl },
    sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardPaid: { opacity: 0.8 },
    cardHeader: { marginBottom: spacing.sm },
    levelLabel: { fontSize: 16, fontWeight: "700", color: colors.primary, marginBottom: 4 },
    reason: { fontSize: 14, color: colors.textSecondary },
    fine: { fontSize: 15, fontWeight: "600", color: colors.text, marginTop: spacing.sm },
    banUntil: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
    payBtn: {
      marginTop: spacing.lg,
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: "center",
    },
    payBtnDisabled: { opacity: 0.7 },
    payBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
    resolved: { fontSize: 14, color: colors.success || "#22c55e", marginTop: spacing.sm, fontWeight: "600" },
    empty: { alignItems: "center", paddingVertical: spacing.xxl },
    emptyText: { fontSize: 16, color: colors.textMuted, marginTop: spacing.sm },
  });
}
