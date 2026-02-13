import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import * as userApi from "../../api/user.api";

export default function BlockedUsersScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBlocked = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await userApi.getBlockedUsers({ limit: 100 });
      setUsers(data?.users ?? []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBlocked();
  }, [loadBlocked]);

  const handleUnblock = useCallback(
    (user) => {
      const name = user.display_name ?? user.displayName ?? "this user";
      Alert.alert(
        "Unblock user",
        `Unblock ${name}? They will be able to see your profile and message you again.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Unblock",
            onPress: async () => {
              try {
                await userApi.unblockUser(user.id ?? user.userId);
                setUsers((prev) => prev.filter((u) => String(u.id ?? u.userId) !== String(user.id ?? user.userId)));
              } catch (e) {
                Alert.alert("Error", e?.message || "Could not unblock.");
              }
            },
          },
        ]
      );
    },
    []
  );

  const renderItem = ({ item }) => {
    const id = item.id ?? item.userId;
    const name = item.display_name ?? item.displayName ?? `User ${id}`;
    const avatarUrl = item.avatar_url ?? item.avatarUrl;
    return (
      <View style={styles.row}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <TouchableOpacity
          style={styles.unblockBtn}
          onPress={() => handleUnblock(item)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="block" size={18} color={colors.white} />
          <Text style={styles.unblockBtnText}>Unblock</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const listHeader = (
    <View style={[styles.headerWrap, { paddingTop: insets.top + spacing.sm }]}>
      <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()} activeOpacity={0.8}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.backLabel}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.screenTitle}>Blacklist</Text>
    </View>
  );

  if (loading && users.length === 0) {
    return (
      <View style={styles.container}>
        {listHeader}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => String(item.id ?? item.userId)}
        renderItem={renderItem}
        ListHeaderComponent={
          <View>
            {listHeader}
            <Text style={styles.subtitle}>Users you've blocked. Tap Unblock to allow them again.</Text>
          </View>
        }
        contentContainerStyle={users.length === 0 ? styles.emptyList : styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>You haven't blocked anyone.</Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadBlocked(true)}
            colors={[colors.primary]}
          />
        }
      />
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    headerWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    backRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md, gap: spacing.xs },
    backLabel: { fontSize: 17, fontWeight: "600", color: colors.text },
    screenTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
    emptyList: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
    emptyText: { fontSize: 16, color: colors.textMuted, textAlign: "center" },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.md,
    },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    avatarPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surfaceLight,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarLetter: { fontSize: 20, fontWeight: "700", color: colors.text },
    name: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
    unblockBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 10,
      backgroundColor: colors.primary,
    },
    unblockBtnText: { fontSize: 14, fontWeight: "600", color: colors.white },
  });
}
