import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import SubScreenHeader from "../../components/SubScreenHeader";
import * as walletApi from "../../services/wallet.api";

export default function RechargeScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    try {
      const p = await walletApi.listPackages();
      setPackages(Array.isArray(p) ? p : []);
    } catch (_) {
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const handlePurchase = useCallback(async (pkg) => {
    setPurchasing(pkg.packageId);
    try {
      const data = await walletApi.createRechargeIntent(pkg.packageId);
      const clientSecret = data?.clientSecret;
      if (clientSecret) {
        try {
          const { initPaymentSheet, presentPaymentSheet } = require("@stripe/stripe-react-native");
          await initPaymentSheet({
            paymentIntentClientSecret: clientSecret,
            merchantDisplayName: "Medanya",
          });
          const { error } = await presentPaymentSheet();
          if (error) {
            Alert.alert("Payment failed", error.message);
          } else {
            Alert.alert("Success", `You received ${pkg.coins} coins!`, [
              { text: "OK", onPress: () => navigation.goBack() },
            ]);
          }
        } catch (stripeErr) {
          Alert.alert(
            "Stripe not configured",
            "Install @stripe/stripe-react-native for in-app payments. Or use web checkout.",
            [{ text: "OK" }]
          );
        }
      } else {
        Alert.alert("Error", "Could not start payment.");
      }
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.message || "Failed to start payment";
      Alert.alert("Error", msg);
    } finally {
      setPurchasing(null);
    }
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SubScreenHeader title="Recharge" onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.subtitle}>Choose a coin package</Text>
          {packages.map((pkg) => (
            <TouchableOpacity
              key={pkg.packageId}
              style={[styles.pkgCard, purchasing === pkg.packageId && styles.pkgCardDisabled]}
              onPress={() => handlePurchase(pkg)}
              disabled={!!purchasing}
            >
              <View style={styles.pkgLeft}>
                <Text style={styles.pkgCoins}>{pkg.coins} coins</Text>
                <Text style={styles.pkgPrice}>
                  ${((pkg.usdCents || 0) / 100).toFixed(2)}
                </Text>
              </View>
              {purchasing === pkg.packageId ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          ))}
          {packages.length === 0 && (
            <Text style={styles.empty}>No packages available</Text>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    content: { padding: spacing.lg },
    subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: spacing.lg },
    pkgCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pkgCardDisabled: { opacity: 0.7 },
    pkgLeft: {},
    pkgCoins: { fontSize: 18, fontWeight: "700", color: colors.text },
    pkgPrice: { fontSize: 14, color: colors.primary, marginTop: 2 },
    empty: { fontSize: 16, color: colors.textMuted, textAlign: "center", padding: spacing.xl },
  });
}
