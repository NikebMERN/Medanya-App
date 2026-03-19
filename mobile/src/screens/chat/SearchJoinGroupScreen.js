import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useDebounce } from "../../hooks/useDebounce";
import SubScreenHeader from "../../components/SubScreenHeader";
import * as chatApi from "../../services/chat.api";
import { useChatStore } from "../../store/chat.store";

const DEBOUNCE_MS = 400;

export default function SearchJoinGroupScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const setChats = useChatStore((s) => s.setChats);

  const [searchInput, setSearchInput] = useState("");
  const [searchBy, setSearchBy] = useState("name"); // "name" | "id"
  const debouncedQ = useDebounce(searchInput.trim(), DEBOUNCE_MS);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState(null);
  const [error, setError] = useState(null);

  const searchParams = useMemo(() => {
    const q = debouncedQ;
    if (!q) return null;
    if (searchBy === "id") return { id: q };
    return { q };
  }, [debouncedQ, searchBy]);

  const doSearch = useCallback(async (isRefresh = false) => {
    if (!searchParams) {
      setGroups([]);
      setError(null);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await chatApi.searchGroups(searchParams);
      const list = Array.isArray(res?.groups) ? res.groups : [];
      setGroups(list);
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.message || "Search failed";
      setError(msg);
      setGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchParams]);

  React.useEffect(() => {
    if (!searchParams) {
      setGroups([]);
      setError(null);
      return;
    }
    doSearch();
  }, [searchParams]);

  const onRefresh = useCallback(() => {
    if (searchParams) doSearch(true);
  }, [searchParams, doSearch]);

  const handleJoin = useCallback(
    async (group) => {
      const chatId = group.id || group._id;
      if (!chatId) return;
      if (group.isMember) {
        navigation.replace("ChatRoom", { chatId });
        return;
      }
      setJoiningId(chatId);
      try {
        await chatApi.joinGroup(chatId);
        setGroups((prev) =>
          prev.map((g) => (String(g.id || g._id) === String(chatId) ? { ...g, isMember: true } : g))
        );
        const res = await chatApi.listChats({ limit: 50 });
        if (res?.chats) setChats(res.chats);
        Alert.alert("Joined", "You joined the group.", [
          { text: "Open", onPress: () => navigation.replace("ChatRoom", { chatId }) },
          { text: "Stay", onPress: () => {} },
        ]);
      } catch (e) {
        const msg = e?.response?.data?.error?.message || e?.message || "Could not join group";
        Alert.alert("Error", msg);
      } finally {
        setJoiningId(null);
      }
    },
    [navigation, setChats]
  );

  const renderItem = ({ item }) => {
    const name = item.groupName || "Group";
    const count = item.participantCount ?? 0;
    const isMember = item.isMember;
    const chatId = item.id || item._id;
    const joining = joiningId === chatId;

    return (
      <View style={styles.row}>
        <View style={styles.rowBody}>
          <Text style={styles.rowName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.rowMeta}>
            {count} member{count !== 1 ? "s" : ""}
            {isMember ? " · You're in" : ""}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.joinBtn, isMember && styles.joinBtnIn]}
          onPress={() => handleJoin(item)}
          disabled={joining}
        >
          {joining ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.joinBtnText}>{isMember ? "Open" : "Join"}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const tabNav = navigation.getParent?.() ?? navigation;
  const listHeader = (
    <View style={styles.header}>
      <Text style={styles.hint}>Search by group name or paste group ID</Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, searchBy === "name" && styles.toggleBtnActive]}
          onPress={() => setSearchBy("name")}
        >
          <Text style={[styles.toggleText, searchBy === "name" && styles.toggleTextActive]}>By name</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, searchBy === "id" && styles.toggleBtnActive]}
          onPress={() => setSearchBy("id")}
        >
          <Text style={[styles.toggleText, searchBy === "id" && styles.toggleTextActive]}>By ID</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.input}
        placeholder={searchBy === "id" ? "Group ID" : "Group name"}
        placeholderTextColor={colors.textMuted}
        value={searchInput}
        onChangeText={(t) => {
          setSearchInput(t);
          setError(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );

  const empty = !searchParams ? null : loading ? (
    <View style={styles.empty}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  ) : (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>No groups found. Try another name or ID.</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <SubScreenHeader
        title="Search & join group"
        onBack={() => navigation.goBack()}
        showProfileDropdown
        navigation={tabNav}
      />
      <FlatList
        data={groups}
        keyExtractor={(item) => String(item.id ?? item._id)}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={empty}
        contentContainerStyle={[styles.listContent, groups.length === 0 && styles.listContentFlex]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      />
    </KeyboardAvoidingView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    backRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md, gap: spacing.xs },
    backLabel: { fontSize: 17, fontWeight: "600", color: colors.text },
    title: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: spacing.xs },
    hint: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md },
    toggleRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
    toggleBtn: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 8,
      backgroundColor: colors.surface,
    },
    toggleBtnActive: { backgroundColor: colors.primary },
    toggleText: { fontSize: 14, fontWeight: "600", color: colors.text },
    toggleTextActive: { color: colors.white },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    errorText: { color: colors.error, fontSize: 13, marginTop: spacing.sm },
    listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
    listContentFlex: { flexGrow: 1 },
    empty: { flex: 1, justifyContent: "center", paddingVertical: spacing.xxl },
    emptyText: { textAlign: "center", color: colors.textSecondary, fontSize: 15 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    rowBody: { flex: 1 },
    rowName: { fontSize: 16, fontWeight: "700", color: colors.text },
    rowMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    joinBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      minWidth: 72,
      alignItems: "center",
    },
    joinBtnIn: { backgroundColor: colors.textMuted },
    joinBtnText: { color: colors.white, fontWeight: "600", fontSize: 14 },
  });
}
