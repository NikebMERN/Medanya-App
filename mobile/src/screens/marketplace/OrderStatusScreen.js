import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import SubScreenHeader from "../../components/SubScreenHeader";
import { useAuthStore } from "../../store/auth.store";
import * as ordersApi from "../../services/orders.api";
import DeliveryCodeSection from "./DeliveryCodeSection";

const STATUS_LABELS = {
  PENDING_PAYMENT: "Awaiting payment",
  AUTHORIZED: "Payment authorized",
  COD_SELECTED: "Cash on delivery",
  SHIPPED: "Shipped",
  DELIVERED_PENDING_CODE: "Delivered – awaiting confirmation",
  COMPLETED: "Completed",
  DISPUTED: "Disputed",
  CANCELED: "Canceled",
  EXPIRED: "Expired",
};

export default function OrderStatusScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const orderId = route.params?.orderId;
  const userId = useAuthStore((s) => s.user)?.id ?? useAuthStore((s) => s.user)?.userId;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const o = await ordersApi.getOrder(orderId);
      setOrder(o);
    } catch (_) {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  if (loading && !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = order.status || "PENDING_PAYMENT";
  const isSeller = userId && String(order.seller_id) === String(userId);
  const isBuyer = userId && String(order.buyer_id || order.user_id) === String(userId);
  const canConfirmDelivery = isSeller && ["SHIPPED", "DELIVERED_PENDING_CODE", "COD_SELECTED", "AUTHORIZED"].includes(status);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SubScreenHeader title="Order Status" onBack={() => navigation.goBack()} showProfileDropdown navigation={navigation?.getParent?.() ?? navigation} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.orderId}>Order #{order.id}</Text>
          <View style={styles.statusRow}>
            <MaterialIcons
              name="info"
              size={24}
              color={status === "COMPLETED" ? colors.success : colors.primary}
            />
            <Text style={styles.statusText}>{STATUS_LABELS[status] || status}</Text>
          </View>
          <Text style={styles.meta}>
            AED {(order.total_cents || 0) / 100} {order.payment_method === "COD" ? "(COD)" : ""}
          </Text>
        </View>

        {isBuyer && <DeliveryCodeSection orderId={order.id} orderStatus={status} />}
        {canConfirmDelivery && (
          <TouchableOpacity
            style={styles.btn}
            onPress={() => navigation.navigate("DeliveryConfirm", { orderId: order.id })}
          >
            <Text style={styles.btnText}>Confirm delivery</Text>
          </TouchableOpacity>
        )}
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
      padding: spacing.lg,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    orderId: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
    statusText: { fontSize: 16, fontWeight: "600", color: colors.text },
    meta: { fontSize: 14, color: colors.textMuted },
    btn: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: "center",
    },
    btnText: { fontSize: 16, fontWeight: "700", color: colors.white },
    errorText: { fontSize: 16, color: colors.error, marginBottom: spacing.sm },
    link: { fontSize: 16, fontWeight: "600", color: colors.primary },
  });
}
