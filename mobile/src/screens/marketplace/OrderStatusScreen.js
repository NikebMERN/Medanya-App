import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import SubScreenHeader from "../../components/SubScreenHeader";
import { useAuthStore } from "../../store/auth.store";
import * as ordersApi from "../../services/orders.api";
import DeliveryCodeSection from "./DeliveryCodeSection";
import { normalizePlaceholder } from "../../components/ui/Input";
import { inputStyleAndroid } from "../../theme/inputStyles";

const SELLER_CANCEL_REASONS = [
  { key: "distance_too_far", label: "Distance too far" },
  { key: "not_available", label: "Not available" },
  { key: "address_issue", label: "Address issue" },
  { key: "other", label: "Other" },
];

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
  PLACED: "Order placed",
  ACCEPTED: "Accepted",
  ACCEPTED_PENDING_FEE_CONFIRM: "Delivery fee pending your confirmation",
  PACKED: "Packed",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
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
  const [deliveryFeeModalVisible, setDeliveryFeeModalVisible] = useState(false);
  const [deliveryFeeInput, setDeliveryFeeInput] = useState("");
  const [cancelReasonModalVisible, setCancelReasonModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelReasonOther, setCancelReasonOther] = useState("");
  const [acceptWithFeeModalVisible, setAcceptWithFeeModalVisible] = useState(false);
  const [acceptDeliveryFeeInput, setAcceptDeliveryFeeInput] = useState("");

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
  const allowConfirmStatuses = ["OUT_FOR_DELIVERY", "SHIPPED", "DELIVERED_PENDING_CODE", "COD_SELECTED", "AUTHORIZED"];
  const canConfirmDelivery = isSeller && order.payment_method === "STRIPE" && allowConfirmStatuses.includes(status);
  const canDeclineCod = isBuyer && order.payment_method === "COD" && (status === "COD_SELECTED" || status === "PLACED");
  const canSellerCancelCod = isSeller && order.payment_method === "COD" && (status === "COD_SELECTED" || status === "PLACED");
  const canSellerAccept = isSeller && status === "PLACED";
  const canSellerReject = isSeller && status === "PLACED";
  const canSellerMarkPacked = isSeller && status === "ACCEPTED";
  const canSellerMarkOutForDelivery = isSeller && status === "PACKED";
  const proposedFeeCents = order.proposed_delivery_fee_cents ?? 0;
  const hasProposedDeliveryFee = isBuyer && order.payment_method === "COD" && status === "ACCEPTED_PENDING_FEE_CONFIRM";
  const canAddDeliveryFee = isSeller && order.payment_method === "COD" && status === "COD_SELECTED" && !proposedFeeCents;
  const canSellerMarkDelivered = isSeller && order.payment_method === "COD" && (status === "OUT_FOR_DELIVERY" || status === "DELIVERED");

  const handleSellerCancelCod = async () => {
    if (!cancelReason) {
      alert("Please select a reason.");
      return;
    }
    if (cancelReason === "other" && !cancelReasonOther.trim()) {
      alert("Please provide a reason for 'Other'.");
      return;
    }
    setCancelReasonModalVisible(false);
    try {
      const updated = await ordersApi.cancelCodOrder(order.id, {
        reason: cancelReason,
        reasonOther: cancelReason === "other" ? cancelReasonOther.trim() : undefined,
      });
      setOrder(updated);
      setCancelReason("");
      setCancelReasonOther("");
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.message || "Could not cancel order.";
      alert(msg);
    }
  };

  const handleProposeDeliveryFee = async () => {
    const amount = parseFloat(deliveryFeeInput.replace(/,/g, "."), 10);
    if (Number.isNaN(amount) || amount <= 0) {
      alert("Please enter a valid delivery fee (e.g. 10 or 15.50).");
      return;
    }
    const deliveryFeeCents = Math.round(amount * 100);
    setDeliveryFeeModalVisible(false);
    setDeliveryFeeInput("");
    try {
      const updated = await ordersApi.proposeDeliveryFee(order.id, deliveryFeeCents);
      setOrder(updated);
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.message || "Could not add delivery fee.";
      alert(msg);
    }
  };

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
            {(order.delivery_fee_cents || proposedFeeCents) > 0 && (
              <Text style={styles.meta}> (incl. delivery AED {((order.delivery_fee_cents || proposedFeeCents) / 100).toFixed(2)})</Text>
            )}
          </Text>
          {order.payment_method === "STRIPE" && order.escrow_status === "HELD" && (
            <Text style={styles.escrowHint}>Payment: HELD (escrow until delivery confirmed)</Text>
          )}
          {order.payment_method === "STRIPE" && order.escrow_status === "RELEASED" && (
            <Text style={styles.escrowHint}>Payment: RELEASED to seller</Text>
          )}
          {order.payment_method === "COD" && (order.cod_cash_due_cents ?? 0) > 0 && (
            <Text style={styles.cashDue}>Pay cash on delivery: AED {((order.cod_cash_due_cents || 0) / 100).toFixed(2)}</Text>
          )}
          {order.payout_status === "PAID" && isSeller && (
            <Text style={styles.escrowHint}>Paid to your account</Text>
          )}
          {order.payout_status === "PENDING" && isSeller && (
            <Text style={styles.escrowHint}>Payout pending (will retry)</Text>
          )}
          {isBuyer && order.seller_phone && (
            <View style={styles.sellerRow}>
              <MaterialIcons name="phone" size={20} color={colors.primary} />
              <Text style={styles.sellerPhone}>Seller: {order.seller_phone}</Text>
            </View>
          )}
        </View>

        {isBuyer && order.payment_method === "STRIPE" && (
          <DeliveryCodeSection orderId={order.id} orderStatus={status} confirmation={order.confirmation} />
        )}

        {hasProposedDeliveryFee && (
          <View style={[styles.card, { marginTop: spacing.sm }]}>
            <Text style={styles.sectionTitle}>Delivery fee requested</Text>
            <Text style={styles.meta}>
              Seller proposed a delivery fee of AED {(proposedFeeCents / 100).toFixed(2)}. New total: AED {(((order.total_cents || 0) + proposedFeeCents) / 100).toFixed(2)}.
            </Text>
            <View style={styles.rowButtons}>
              <TouchableOpacity
                style={[styles.btn, styles.btnHalf, { backgroundColor: colors.success || "#2e7d32" }]}
                onPress={async () => {
                  try {
                    const updated = await ordersApi.confirmDeliveryFee(order.id, "CONFIRM");
                    setOrder(updated);
                  } catch (e) {
                    const msg = e?.response?.data?.error?.message || e?.message || "Could not confirm.";
                    alert(msg);
                  }
                }}
              >
                <Text style={styles.btnText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnHalf, { backgroundColor: colors.error || "#e53935" }]}
                onPress={async () => {
                  try {
                    const updated = await ordersApi.confirmDeliveryFee(order.id, "DECLINE");
                    setOrder(updated);
                  } catch (e) {
                    const msg = e?.response?.data?.error?.message || e?.message || "Could not decline.";
                    alert(msg);
                  }
                }}
              >
                <Text style={styles.btnText}>Decline (cancel order)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {canDeclineCod && !hasProposedDeliveryFee && (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.error || "#e53935", marginTop: spacing.md }]}
            onPress={async () => {
              try {
                const declined = await ordersApi.cancelCodOrder(order.id);
                setOrder(declined);
              } catch (e) {
                const msg = e?.response?.data?.error?.message || e?.message || "Could not decline order.";
                alert(msg);
              }
            }}
          >
            <Text style={styles.btnText}>Decline COD order</Text>
          </TouchableOpacity>
        )}

        {canAddDeliveryFee && (
          <TouchableOpacity
            style={[styles.btn, { marginTop: spacing.md, backgroundColor: colors.primary }]}
            onPress={() => setDeliveryFeeModalVisible(true)}
          >
            <Text style={styles.btnText}>Add delivery fee</Text>
          </TouchableOpacity>
        )}

        {canSellerCancelCod && (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.error || "#e53935", marginTop: spacing.md }]}
            onPress={() => setCancelReasonModalVisible(true)}
          >
            <Text style={styles.btnText}>Cancel COD order</Text>
          </TouchableOpacity>
        )}

        {canSellerAccept && (
          <View style={styles.rowButtons}>
            <TouchableOpacity
              style={[styles.btn, styles.btnHalf, { backgroundColor: colors.success || "#2e7d32" }]}
              onPress={async () => {
                if (order.payment_method === "COD") {
                  setAcceptWithFeeModalVisible(true);
                  return;
                }
                try {
                  const updated = await ordersApi.sellerAcceptOrder(order.id);
                  setOrder(updated);
                } catch (e) {
                  const code = e?.response?.data?.error?.code;
                  const msg = e?.response?.data?.error?.message || e?.message || "Could not accept.";
                  if (code === "PAYOUTS_NOT_SETUP") {
                    Alert.alert(
                      "Set up payouts",
                      "Please set up payouts to your bank before accepting card orders.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Set up payouts",
                          onPress: () => {
                            const tabNav = navigation.getParent?.()?.getParent?.();
                            if (tabNav) tabNav.navigate("Profile", { screen: "PayoutSetup" });
                            else navigation.navigate("PayoutSetup");
                          },
                        },
                      ]
                    );
                  } else {
                    alert(msg);
                  }
                }
              }}
            >
              <Text style={styles.btnText}>Accept order</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnHalf, { backgroundColor: colors.error || "#e53935" }]}
              onPress={async () => {
                try {
                  const updated = await ordersApi.sellerRejectOrder(order.id);
                  setOrder(updated);
                } catch (e) {
                  const msg = e?.response?.data?.error?.message || e?.message || "Could not reject.";
                  alert(msg);
                }
              }}
            >
              <Text style={styles.btnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {canSellerMarkPacked && (
          <TouchableOpacity
            style={[styles.btn, { marginTop: spacing.md }]}
            onPress={async () => {
              try {
                const updated = await ordersApi.sellerUpdateOrderStatus(order.id, "PACKED");
                setOrder(updated);
              } catch (e) {
                const msg = e?.response?.data?.error?.message || e?.message || "Could not update.";
                alert(msg);
              }
            }}
          >
            <Text style={styles.btnText}>Mark packed</Text>
          </TouchableOpacity>
        )}

        {canSellerMarkOutForDelivery && (
          <TouchableOpacity
            style={[styles.btn, { marginTop: spacing.md }]}
            onPress={async () => {
              try {
                const updated = await ordersApi.sellerUpdateOrderStatus(order.id, "OUT_FOR_DELIVERY");
                setOrder(updated);
              } catch (e) {
                const msg = e?.response?.data?.error?.message || e?.message || "Could not update.";
                alert(msg);
              }
            }}
          >
            <Text style={styles.btnText}>Out for delivery</Text>
          </TouchableOpacity>
        )}

        {canConfirmDelivery && (
          <TouchableOpacity
            style={[styles.btn, { marginTop: spacing.md }]}
            onPress={() => navigation.navigate("DeliveryConfirm", { orderId: order.id })}
          >
            <Text style={styles.btnText}>Confirm delivery</Text>
          </TouchableOpacity>
        )}

        {canSellerMarkDelivered && (
          <TouchableOpacity
            style={[styles.btn, { marginTop: spacing.md, backgroundColor: colors.success || "#2e7d32" }]}
            onPress={async () => {
              try {
                const updated = await ordersApi.sellerMarkDelivered(order.id);
                setOrder(updated);
              } catch (e) {
                const msg = e?.response?.data?.error?.message || e?.message || "Could not mark delivered.";
                alert(msg);
              }
            }}
          >
            <Text style={styles.btnText}>Mark delivered</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={acceptWithFeeModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => { setAcceptWithFeeModalVisible(false); setAcceptDeliveryFeeInput(""); }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalContentWrap}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.card, styles.modalCard]}>
                <Text style={styles.modalTitle}>Accept order – delivery fee (optional)</Text>
                <Text style={styles.meta}>Enter delivery fee in AED (or 0). Buyer will need to confirm before you can deliver.</Text>
                <TextInput
                  style={[styles.input, inputStyleAndroid]}
                  placeholder={normalizePlaceholder("e.g. 0, 15 or 20.50")}
                  placeholderTextColor={colors.textMuted}
                  value={acceptDeliveryFeeInput}
                  onChangeText={setAcceptDeliveryFeeInput}
                  keyboardType="decimal-pad"
                />
                <View style={styles.rowButtons}>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnHalf]}
                    onPress={async () => {
                      const amount = parseFloat(String(acceptDeliveryFeeInput).replace(/,/g, "."), 10);
                      const deliveryFeeCents = Math.round((Number.isNaN(amount) ? 0 : Math.max(0, amount)) * 100);
                      setAcceptWithFeeModalVisible(false);
                      setAcceptDeliveryFeeInput("");
                      try {
                        const updated = await ordersApi.sellerAcceptOrder(order.id, { deliveryFeeCents });
                        setOrder(updated);
                      } catch (e) {
                        alert(e?.response?.data?.error?.message || e?.message || "Could not accept order.");
                      }
                    }}
                  >
                    <Text style={styles.btnText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnHalf, { backgroundColor: colors.textMuted }]}
                    onPress={() => { setAcceptWithFeeModalVisible(false); setAcceptDeliveryFeeInput(""); }}
                  >
                    <Text style={styles.btnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      <Modal visible={deliveryFeeModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDeliveryFeeModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalContentWrap}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.card, styles.modalCard]}>
                <Text style={styles.modalTitle}>Add delivery fee</Text>
                <Text style={styles.meta}>Enter the delivery fee amount in AED. The buyer will need to accept before you can start delivery.</Text>
                <TextInput
                  style={[styles.input, inputStyleAndroid]}
                  placeholder={normalizePlaceholder("e.g. 15 or 20.50")}
                  placeholderTextColor={colors.textMuted}
                  value={deliveryFeeInput}
                  onChangeText={setDeliveryFeeInput}
                  keyboardType="decimal-pad"
                />
                <View style={styles.rowButtons}>
                  <TouchableOpacity style={[styles.btn, styles.btnHalf]} onPress={handleProposeDeliveryFee}>
                    <Text style={styles.btnText}>Submit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnHalf, { backgroundColor: colors.textMuted }]}
                    onPress={() => { setDeliveryFeeModalVisible(false); setDeliveryFeeInput(""); }}
                  >
                    <Text style={styles.btnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      <Modal visible={cancelReasonModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCancelReasonModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalContentWrap}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.card, styles.modalCard]}>
                <Text style={styles.modalTitle}>Cancel COD order</Text>
                <Text style={styles.meta}>Please select a reason. The buyer will be notified.</Text>
                {SELLER_CANCEL_REASONS.map((r) => (
                  <TouchableOpacity
                    key={r.key}
                    style={[styles.reasonOption, cancelReason === r.key && styles.reasonOptionSelected]}
                    onPress={() => setCancelReason(r.key)}
                  >
                    <Text style={[styles.reasonLabel, cancelReason === r.key && { color: colors.primary, fontWeight: "600" }]}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
                {cancelReason === "other" && (
                  <TextInput
                    style={[styles.input, inputStyleAndroid, { marginTop: spacing.sm }]}
                    placeholder={normalizePlaceholder("Please specify the reason")}
                    placeholderTextColor={colors.textMuted}
                    value={cancelReasonOther}
                    onChangeText={setCancelReasonOther}
                    multiline
                  />
                )}
                <View style={styles.rowButtons}>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnHalf, { backgroundColor: colors.error || "#e53935" }]}
                    onPress={handleSellerCancelCod}
                  >
                    <Text style={styles.btnText}>Cancel order</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnHalf, { backgroundColor: colors.textMuted }]}
                    onPress={() => { setCancelReasonModalVisible(false); setCancelReason(""); setCancelReasonOther(""); }}
                  >
                    <Text style={styles.btnText}>Back</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
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
    sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: spacing.sm },
    sellerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
    sellerPhone: { fontSize: 14, fontWeight: "600", color: colors.primary },
    rowButtons: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
    btnHalf: { flex: 1 },
    btn: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: "center",
    },
    btnText: { fontSize: 16, fontWeight: "700", color: colors.white },
    errorText: { fontSize: 16, color: colors.error, marginBottom: spacing.sm },
    link: { fontSize: 16, fontWeight: "600", color: colors.primary },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      padding: spacing.lg,
    },
    modalContentWrap: { width: "100%" },
    modalCard: { marginBottom: 0 },
    modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: spacing.md,
      fontSize: 16,
      color: colors.text,
      marginTop: spacing.sm,
    },
    reasonOption: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 8,
      marginTop: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reasonOptionSelected: { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
    reasonLabel: { fontSize: 15, color: colors.text },
    escrowHint: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs },
    cashDue: { fontSize: 14, fontWeight: "600", color: colors.text, marginTop: spacing.xs },
  });
}
