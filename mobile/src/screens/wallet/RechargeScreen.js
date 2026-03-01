import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { radii, layout } from "../../theme/designSystem";
import { spacing } from "../../theme/spacing";
import SubScreenHeader from "../../components/SubScreenHeader";
import * as walletApi from "../../modules/wallet/wallet.api";
import { useWalletStore } from "../../modules/wallet/wallet.store";

export default function RechargeScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const { fetchWallet, updateBalanceAfterRecharge } = useWalletStore();
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
            updateBalanceAfterRecharge?.(pkg.coins ?? 0);
            await fetchWallet?.();
            Alert.alert("Success", `You received ${pkg.coins ?? pkg.coinAmount ?? 0} MedCoins!`, [
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
  }, [navigation, fetchWallet, updateBalanceAfterRecharge]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SubScreenHeader title="Recharge" onBack={() => navigation.goBack()} showProfileDropdown navigation={navigation?.getParent?.() ?? navigation} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={styles.subtitle}>Choose a MedCoins package</Text>
          {packages.map((pkg) => {
            const coins = pkg.coins ?? pkg.coinAmount ?? 0;
            const bonus = pkg.bonus ? ` (+${pkg.bonus})` : "";
            return (
              <TouchableOpacity
                key={pkg.packageId ?? pkg.id}
                style={[styles.pkgCard, purchasing === (pkg.packageId ?? pkg.id) && styles.pkgCardDisabled]}
                onPress={() => handlePurchase(pkg)}
                disabled={!!purchasing}
              >
                <View style={styles.pkgLeft}>
                  <Text style={styles.pkgCoins}>{coins} MC{bonus}</Text>
                  <Text style={styles.pkgPrice}>
                    ${((pkg.usdCents ?? pkg.priceCents ?? 0) / 100).toFixed(2)}
                  </Text>
                </View>
                {purchasing === (pkg.packageId ?? pkg.id) ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.buyText}>Buy</Text>
                )}
              </TouchableOpacity>
            );
          })}
          {packages.length === 0 && (
            <Text style={styles.empty}>No packages available</Text>
          )}
          <TouchableOpacity
            style={styles.earnLink}
            onPress={() => navigation.navigate("EarnCoins")}
          >
            <MaterialIcons name="stars" size={20} color={colors.primary} />
            <Text style={styles.earnLinkText}>Earn instead</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    scroll: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl },
    subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: spacing.lg },
    pkgCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: radii.card,
      padding: layout.cardPadding,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pkgCardDisabled: { opacity: 0.7 },
    pkgLeft: {},
    pkgCoins: { fontSize: 18, fontWeight: "700", color: colors.text },
    pkgPrice: { fontSize: 14, color: colors.primary, marginTop: 2 },
    buyText: { fontSize: 14, fontWeight: "700", color: colors.primary },
    empty: { fontSize: 16, color: colors.textMuted, textAlign: "center", padding: spacing.xl },
    earnLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.xl },
    earnLinkText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  });
}
