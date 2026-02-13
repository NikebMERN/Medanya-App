import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import SubScreenHeader from "../../components/SubScreenHeader";
import { useAuthStore } from "../../store/auth.store";
import { getFollowers } from "../../api/user.api";
import { useDebounce } from "../../hooks/useDebounce";

const DEBOUNCE_MS = 300;
const PAGE_LIMIT = 100;

export default function FollowersListScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const currentUserId = useAuthStore((s) => s.user?.id ?? s.user?.userId) ?? "";
  const userId = route.params?.userId ?? currentUserId;

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQ = useDebounce(searchQuery.trim(), DEBOUNCE_MS);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await getFollowers(userId, { limit: PAGE_LIMIT, q: debouncedQ || undefined });
      const list = Array.isArray(res?.users) ? res.users : [];
      setUsers(list.map((u) => ({ ...u, id: String(u.id) })));
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.error?.message || e?.message;
      if (status === 403 || (msg && msg.toLowerCase().includes("private"))) {
        setError("This account is private. Follow them to see their followers.");
      } else {
        setError(msg || "Failed to load followers");
      }
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, debouncedQ]);

  useEffect(() => {
    load();
  }, [load]);

  const openProfile = (u) => {
    const uid = u?.id ?? u?.userId;
    if (!uid || String(uid) === String(currentUserId)) return;
    navigation.navigate("UserProfile", { userId: uid });
  };

  const renderItem = ({ item }) => {
    const name = item.display_name ?? item.displayName ?? `User ${item.id}`;
    const avatarUrl = item.avatar_url ?? item.avatarUrl;
    const phone = item.phone_number ?? item.phoneNumber;

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => openProfile(item)}
        activeOpacity={0.7}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            ID: {item.id}{phone ? ` · ${phone.trim().startsWith("+") ? phone : `+${phone}`}` : ""}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  const tabNav = navigation.getParent?.() ?? navigation;
  const listHeader = (
    <View style={styles.headerWrap}>
      <SubScreenHeader
        title="Followers"
        onBack={() => navigation.goBack()}
        showProfileDropdown
        navigation={tabNav}
      />
      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={22} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, ID or phone..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={12}>
            <MaterialIcons name="close" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && users.length === 0 ? (
        <View style={styles.center}>
          {listHeader}
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          {listHeader}
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          contentContainerStyle={users.length === 0 ? styles.emptyList : undefined}
          ListEmptyComponent={<Text style={styles.emptyText}>No followers found</Text>}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
          }
        />
      )}
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
    backRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm, gap: spacing.xs },
    backLabel: { fontSize: 17, fontWeight: "600", color: colors.text },
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      marginVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      gap: spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      paddingVertical: spacing.sm,
      fontStyle: typography.fontStyle,
    },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    error: { color: colors.error, fontSize: 14 },
    emptyList: { flexGrow: 1, padding: spacing.lg },
    emptyText: { textAlign: "center", color: colors.textMuted, fontStyle: typography.fontStyle },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    avatarPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarLetter: { color: colors.white, fontSize: 20, fontWeight: "700" },
    body: { flex: 1, marginLeft: spacing.md, minWidth: 0 },
    name: { fontSize: 16, fontWeight: "600", color: colors.text, fontStyle: typography.fontStyle },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontStyle: typography.fontStyle },
  });
}
