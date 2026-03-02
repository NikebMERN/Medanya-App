import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import SubScreenHeader from "../../components/SubScreenHeader";
import * as notificationsApi from "../../api/notifications.api";

export default function NotificationsScreen({ navigation }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [notifications, setNotifications] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await notificationsApi.listNotifications();
      setNotifications(data.notifications || []);
      setUnseenCount(data.unseenCount ?? 0);
      if ((data.unseenCount ?? 0) > 0) {
        await notificationsApi.markAllNotificationsSeen();
      }
    } catch (_) {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const onNotificationPress = async (item) => {
    const orderId = item.data?.type === "order" && item.data?.orderId ? item.data.orderId : null;

    if (orderId) {
      // Keep order notification until order is delivered or cancelled; just navigate and mark seen
      if (!item.seen && item.id) {
        try {
          await notificationsApi.markNotificationSeen(item.id);
          setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, seen: true } : n)));
          setUnseenCount((c) => Math.max(0, c - 1));
        } catch (_) {}
      }
      navigation.navigate("Marketplace", {
        screen: "OrderStatus",
        params: { orderId },
        initial: false,
      });
      return;
    }

    if (!item.seen && item.id) {
      try {
        await notificationsApi.markNotificationSeen(item.id);
      } catch (_) {}
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, !item.seen && styles.cardUnread]}
      onPress={() => onNotificationPress(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.title}>{item.title}</Text>
      {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
      <Text style={styles.time}>
        {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
      </Text>
    </TouchableOpacity>
  );

  if (loading && notifications.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SubScreenHeader title="Notifications" onBack={() => navigation.goBack()} showProfileDropdown navigation={navigation?.getParent?.() ?? navigation} />
      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications(true)} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="notifications-none" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>No notifications</Text>
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
    list: { padding: spacing.lg, paddingBottom: spacing.xxl },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardUnread: { backgroundColor: colors.primary + "08", borderColor: colors.primary + "30" },
    title: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
    body: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm, lineHeight: 20 },
    time: { fontSize: 12, color: colors.textMuted },
    empty: { alignItems: "center", paddingVertical: spacing.xxl },
    emptyText: { fontSize: 16, color: colors.textMuted, marginTop: spacing.md },
  });
}
