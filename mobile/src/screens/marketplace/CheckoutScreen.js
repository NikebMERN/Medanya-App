import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import SubScreenHeader from "../../components/SubScreenHeader";
import * as ordersApi from "../../services/orders.api";
import { trackEvent } from "../../utils/trackEvent";
import * as marketplaceApi from "../../services/marketplace.api";
import { useStripe } from "../../hooks/useStripe";
import { normalizePlaceholder } from "../../components/ui/Input";
import { inputStyleAndroid } from "../../theme/inputStyles";

export default function CheckoutScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const itemId = route.params?.itemId;
  const [item, setItem] = useState(route.params?.item ?? null);
  const [paymentMethod, setPaymentMethod] = useState("STRIPE");
  const [address, setAddress] = useState({
    line1: "",
    city: "",
    state: "",
    postalCode: "",
  });
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingItem, setLoadingItem] = useState(!!itemId && !item);

  const loadItem = useCallback(async () => {
    if (!itemId) return;
    setLoadingItem(true);
    try {
      const i = await marketplaceApi.getItem(itemId);
      setItem(i);
    } catch (_) {
      setItem(null);
    } finally {
      setLoadingItem(false);
    }
  }, [itemId]);

  React.useEffect(() => {
    if (itemId && !item) loadItem();
  }, [itemId, item, loadItem]);

  const handleCreateOrder = useCallback(async () => {
    if (!item) return;
    if (paymentMethod === "STRIPE" && (!address.line1?.trim() || !address.city?.trim())) {
      Alert.alert("Address required", "Please enter delivery address.");
      return;
    }
    setLoading(true);
    try {
      const addr = paymentMethod === "STRIPE" ? address : null;
      const data = await ordersApi.createOrder({
        listingId: item.id,
        qty,
        paymentMethod,
        address: addr,
      });

      const order = data?.order ?? data;
      if (order?.id) {
        if (data?.clientSecret) {
          if (!initPaymentSheet || !presentPaymentSheet) {
            Alert.alert("Payment unavailable", "Stripe is not configured. Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY to your .env (pk_... from Stripe Dashboard).", [
              { text: "OK", onPress: () => navigation.replace("OrderStatus", { orderId: order.id }) },
            ]);
            return;
          }
          try {
            const { error: initErr } = await initPaymentSheet({
              paymentIntentClientSecret: data.clientSecret,
              merchantDisplayName: "Medanya",
            });
            if (initErr) {
              Alert.alert("Payment setup failed", initErr.message);
              return;
            }
            const { error } = await presentPaymentSheet();
            if (error) {
              Alert.alert("Payment failed", error.message);
              return;
            }
            try {
              await ordersApi.notifyPaymentReceived(order.id);
            } catch (_) {}
          } catch (stripeErr) {
            Alert.alert("Payment error", stripeErr?.message || "Could not complete payment. Your order is pending.", [
              { text: "OK", onPress: () => navigation.replace("OrderStatus", { orderId: order.id }) },
            ]);
            return;
          }
        }
        const totalUSD = (item.price || 0) * qty;
        trackEvent("market_purchase", "market_item", item.id, { amountUSD: totalUSD });
        navigation.replace("OrderStatus", { orderId: order.id });
      } else {
        Alert.alert("Error", "Failed to create order.");
      }
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.message || "Failed to create order";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  }, [item, paymentMethod, address, qty, navigation]);

  if (loadingItem || (!item && itemId)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Item not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const price = item.price != null ? item.price : 0;
  const subtotal = price * qty;
  const total = subtotal;
  const currency = item.currency || "AED";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SubScreenHeader title="Checkout" onBack={() => navigation.goBack()} showProfileDropdown navigation={navigation?.getParent?.() ?? navigation} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.itemRow}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemPrice}>{currency} {price}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Quantity</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQty((p) => Math.max(1, p - 1))}
            >
              <MaterialIcons name="remove" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{qty}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQty((p) => Math.min(99, p + 1))}
            >
              <MaterialIcons name="add" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Payment</Text>
          <TouchableOpacity
            style={[styles.radioRow, paymentMethod === "STRIPE" && styles.radioRowActive]}
            onPress={() => setPaymentMethod("STRIPE")}
          >
            <MaterialIcons
              name={paymentMethod === "STRIPE" ? "radio-button-checked" : "radio-button-unchecked"}
              size={24}
              color={colors.primary}
            />
            <Text style={styles.radioText}>Card (Stripe)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioRow, paymentMethod === "COD" && styles.radioRowActive]}
            onPress={() => setPaymentMethod("COD")}
          >
            <MaterialIcons
              name={paymentMethod === "COD" ? "radio-button-checked" : "radio-button-unchecked"}
              size={24}
              color={colors.primary}
            />
            <Text style={styles.radioText}>Cash on Delivery</Text>
          </TouchableOpacity>
          {paymentMethod === "STRIPE" && (
            <Text style={styles.escrowNote}>Escrow: Payment held until delivery confirmed. Refunds: 2–3 business days.</Text>
          )}
          {paymentMethod === "COD" && (
            <Text style={styles.escrowNote}>Pay on delivery. No code or QR; seller will confirm delivery.</Text>
          )}
        </View>

        {paymentMethod === "STRIPE" && (
          <View style={styles.section}>
            <Text style={styles.label}>Delivery Address</Text>
            <TextInput
              style={[styles.input, inputStyleAndroid]}
              placeholder={normalizePlaceholder("Street address")}
              placeholderTextColor={colors.textMuted}
              value={address.line1}
              onChangeText={(t) => setAddress((a) => ({ ...a, line1: t }))}
            />
            <View style={styles.row2}>
              <TextInput
                style={[styles.input, styles.inputHalf, inputStyleAndroid]}
                placeholder={normalizePlaceholder("City")}
                placeholderTextColor={colors.textMuted}
                value={address.city}
                onChangeText={(t) => setAddress((a) => ({ ...a, city: t }))}
              />
              <TextInput
                style={[styles.input, styles.inputHalf, inputStyleAndroid]}
                placeholder={normalizePlaceholder("State")}
                placeholderTextColor={colors.textMuted}
                value={address.state}
                onChangeText={(t) => setAddress((a) => ({ ...a, state: t }))}
              />
            </View>
            <TextInput
              style={[styles.input, inputStyleAndroid]}
              placeholder={normalizePlaceholder("Postal code")}
              placeholderTextColor={colors.textMuted}
              value={address.postalCode}
              onChangeText={(t) => setAddress((a) => ({ ...a, postalCode: t }))}
            />
          </View>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{currency} {total.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleCreateOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.btnText}>Place Order</Text>
          )}
        </TouchableOpacity>
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
    itemRow: { marginBottom: spacing.lg },
    itemTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
    itemPrice: { fontSize: 16, color: colors.primary, marginTop: 4 },
    section: { marginBottom: spacing.lg },
    label: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.sm },
    qtyRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    qtyBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceLight,
      justifyContent: "center",
      alignItems: "center",
    },
    qtyText: { fontSize: 18, fontWeight: "700", color: colors.text, minWidth: 32, textAlign: "center" },
    radioRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.surfaceLight,
      marginBottom: spacing.sm,
    },
    radioRowActive: { backgroundColor: colors.primary + "15" },
    radioText: { fontSize: 16, fontWeight: "600", color: colors.text },
    escrowNote: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs, fontStyle: "italic" },
    input: {
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      padding: spacing.md,
      fontSize: 16,
      color: colors.text,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    row2: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
    inputHalf: { flex: 1 },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: spacing.md,
    },
    totalLabel: { fontSize: 18, fontWeight: "700", color: colors.text },
    totalValue: { fontSize: 20, fontWeight: "800", color: colors.primary },
    btn: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: "center",
      marginTop: spacing.lg,
    },
    btnDisabled: { opacity: 0.7 },
    btnText: { fontSize: 16, fontWeight: "700", color: colors.white },
    errorText: { fontSize: 16, color: colors.error, marginBottom: spacing.sm },
    link: { fontSize: 16, fontWeight: "600", color: colors.primary },
  });
}
