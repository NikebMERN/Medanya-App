import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import SubScreenHeader from "../../components/SubScreenHeader";
import { useAuthStore } from "../../store/auth.store";
import * as userApi from "../../api/user.api";
import * as chatApi from "../../services/chat.api";

export default function AddGroupMembersScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const chatId = route.params?.chatId;
  const userId = useAuthStore((s) => s.user?.id ?? s.user?.userId) ?? "";
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    userApi
      .getFollowers(userId, { limit: 100 })
      .then((data) => {
        if (!cancelled) setContacts(data?.users || []);
      })
      .catch(() => {
        if (!cancelled) setContacts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  const toggleMember = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (!chatId) return;
    const memberIds = Array.from(selectedIds);
    if (memberIds.length === 0) {
      Alert.alert("Select members", "Select at least one person to add.");
      return;
    }
    setSubmitting(true);
    try {
      await chatApi.addGroupMembers(chatId, memberIds);
      Alert.alert("Done", "Members added.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.error?.message || err?.message || "Could not add members."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderContact = ({ item }) => {
    const id = String(item.id ?? item.userId);
    const name = item.display_name ?? item.displayName ?? `User ${id}`;
    const avatarUrl = item.avatar_url ?? item.avatarUrl;
    const selected = selectedIds.has(id);

    return (
      <TouchableOpacity
        style={[styles.contactRow, selected && styles.contactRowSelected]}
        onPress={() => toggleMember(id)}
        activeOpacity={0.7}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.contactName} numberOfLines={1}>{name}</Text>
        {selected && <MaterialIcons name="check-circle" size={24} color={colors.primary} />}
      </TouchableOpacity>
    );
  };

  if (!chatId) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>No chat</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SubScreenHeader
          title="Add members"
          onBack={() => navigation.goBack()}
          showProfileDropdown
          navigation={navigation.getParent?.() ?? navigation}
        />
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => String(item.id ?? item.userId)}
          renderItem={renderContact}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No followers to add. Follow people first.</Text>
          }
        />
      )}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.addBtn, submitting && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.addBtnText}>Add selected</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    backRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm, gap: spacing.xs },
    backLabel: { fontSize: 17, fontWeight: "600", color: colors.text },
    title: { fontSize: 20, fontWeight: "700", color: colors.text },
    listContent: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    contactRowSelected: { backgroundColor: colors.surfaceLight },
    avatar: { width: 44, height: 44, borderRadius: 22, marginRight: spacing.md },
    avatarPlaceholder: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.md,
    },
    avatarLetter: { color: colors.white, fontSize: 18, fontWeight: "600" },
    contactName: { flex: 1, fontSize: 16, color: colors.text, fontWeight: "500" },
    emptyText: { textAlign: "center", color: colors.textMuted, padding: spacing.xl },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    error: { color: colors.error, marginBottom: spacing.sm },
    link: { color: colors.primary, fontWeight: "600" },
    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: spacing.lg,
      paddingBottom: spacing.xl + 24,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    addBtn: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: "center",
    },
    addBtnDisabled: { opacity: 0.7 },
    addBtnText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  });
}
