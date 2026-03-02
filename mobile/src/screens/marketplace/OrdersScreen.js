import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import SubScreenHeader from "../../components/SubScreenHeader";
import * as ordersApi from "../../services/orders.api";
import { normalizePlaceholder } from "../../components/ui/Input";
import { inputStyleAndroid } from "../../theme/inputStyles";

const STATUS_LABELS = {
  PENDING_PAYMENT: "Awaiting payment",
  AUTHORIZED: "Payment authorized",
  COD_SELECTED: "Cash on delivery",
  SHIPPED: "Shipped",
  DELIVERED_PENDING_CODE: "Awaiting confirmation",
  COMPLETED: "Completed",
  DISPUTED: "Disputed",
  CANCELED: "Canceled",
  EXPIRED: "Expired",
};

export default function OrdersScreen({ navigation }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const loadOrders = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const buyer = await ordersApi.listMyOrders({ role: "buyer" });
      const seller = await ordersApi.listMyOrders({ role: "seller" });
      const all = [
        ...(buyer.orders || []).map((o) => ({ ...o, _role: "buyer" })),
        ...(seller.orders || []).map((o) => ({ ...o, _role: "seller" })),
      ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setOrders(all);
    } catch (_) {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  const filteredOrders = useMemo(() => {
    const q = search.trim();
    if (!q) return orders;
    const isNumeric = /^\d+$/.test(q);
    if (isNumeric) {
      return orders.filter((o) => String(o.id).includes(q));
    }
    return orders;
  }, [orders, search]);

  const openOrder = (order) => {
    navigation.navigate("OrderStatus", { orderId: order.id });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openOrder(item)} activeOpacity={0.7}>
      <View style={styles.cardRow}>
        <Text style={styles.orderId}>Order #{item.id}</Text>
        <View style={[styles.chip, { backgroundColor: item.status === "COMPLETED" ? colors.success + "30" : colors.surface }]}>
          <Text style={[styles.chipText, { color: item.status === "COMPLETED" ? colors.success : colors.text }]}>
            {STATUS_LABELS[item.status] || item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.meta}>
        {item._role === "buyer" ? "Bought" : "Sold"} · {(item.total_cents || 0) / 100} {item.payment_method === "COD" ? "COD" : ""}
      </Text>
    </TouchableOpacity>
  );

  if (loading && orders.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SubScreenHeader title="Orders" onBack={() => navigation.goBack()} showProfileDropdown navigation={navigation?.getParent?.() ?? navigation} />
      <View style={styles.searchRow}>
        <MaterialIcons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, inputStyleAndroid]}
          placeholder={normalizePlaceholder("Search by order number")}
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          returnKeyType="search"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadOrders(true)} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="receipt-long" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>No orders yet</Text>
          </View>
        }
      />
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      paddingVertical: 0,
    },
    list: { padding: spacing.lg, paddingBottom: spacing.xxl },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
    orderId: { fontSize: 16, fontWeight: "700", color: colors.text },
    chip: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 8 },
    chipText: { fontSize: 12, fontWeight: "600" },
    meta: { fontSize: 14, color: colors.textMuted },
    empty: { alignItems: "center", paddingVertical: spacing.xxl },
    emptyText: { fontSize: 16, color: colors.textMuted, marginTop: spacing.md },
  });
}
