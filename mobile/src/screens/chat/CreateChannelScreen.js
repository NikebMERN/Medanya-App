import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useAuthStore } from "../../store/auth.store";
import SubScreenHeader from "../../components/SubScreenHeader";
import * as chatApi from "../../services/chat.api";
import * as userApi from "../../api/user.api";

/**
 * Create a channel (uses same backend as group chat).
 * Channel name must be unique per user; members are from followers (no duplicates).
 */
export default function CreateChannelScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const userId = useAuthStore((s) => s.user?.id ?? s.user?.userId) ?? "";
  const [channelName, setChannelName] = useState("");
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await userApi.getFollowers(userId, { limit: 100 });
        const list = data?.users || [];
        if (!cancelled) setContacts(list);
      } catch {
        if (!cancelled) setContacts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
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

  const handleCreate = useCallback(async () => {
    const name = (channelName || "").trim();
    if (!name) {
      Alert.alert("Missing name", "Enter a channel name.");
      return;
    }
    const memberIds = Array.from(selectedIds);
    if (memberIds.length === 0) {
      Alert.alert("Add members", "Select at least one member.");
      return;
    }
    try {
      const discover = await userApi.discoverUsers({ q: name, limit: 5 });
      const users = discover?.users || [];
      const nameLower = name.toLowerCase();
      const taken = users.some(
        (u) => (u.display_name || u.displayName || "").trim().toLowerCase() === nameLower
      );
      if (taken) {
        Alert.alert(
          "Name not allowed",
          "This name is already used by a user. Please choose a different channel name."
        );
        return;
      }
    } catch {
      // proceed if discover fails (e.g. network)
    }
    setSubmitting(true);
    try {
      const res = await chatApi.createGroup(name, memberIds, true);
      const chat = res?.chat;
      if (chat?.id || chat?._id) {
        const chatId = String(chat._id || chat.id);
        setChannelName("");
        setSelectedIds(new Set());
        navigation.replace("ChatRoom", { chatId });
      } else {
        Alert.alert("Error", "Could not create channel.");
      }
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.error?.message || err.message || "Failed to create channel."
      );
    } finally {
      setSubmitting(false);
    }
  }, [channelName, selectedIds, navigation]);

  const renderContact = ({ item }) => {
    const id = item.id ?? item.userId;
    const name = item.display_name ?? item.displayName ?? `User ${id}`;
    const avatarUrl = item.avatar_url ?? item.avatarUrl;
    const selected = selectedIds.has(String(id));

    return (
      <TouchableOpacity
        style={[styles.contactRow, selected && styles.contactRowSelected]}
        onPress={() => toggleMember(String(id))}
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

  const tabNav = navigation.getParent?.() ?? navigation;
  const listHeader = (
    <View style={styles.headerWrap}>
      <SubScreenHeader
        title="Create channel"
        onBack={() => navigation.goBack()}
        showProfileDropdown
        navigation={tabNav}
      />
      <View style={[styles.form, { paddingHorizontal: spacing.lg }]}>
        <Text style={styles.label}>Channel name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter channel name"
          placeholderTextColor={colors.textMuted}
          value={channelName}
          onChangeText={setChannelName}
        />
        <Text style={[styles.label, { marginTop: spacing.lg }]}>Add members (from your followers)</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          {listHeader}
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => String(item.id ?? item.userId)}
          renderItem={renderContact}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No followers to add. Follow people first.</Text>
          }
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createBtn, submitting && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.createBtnText}>Create channel</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerWrap: { marginBottom: spacing.sm },
    form: { paddingBottom: spacing.sm },
    label: { fontSize: 14, fontWeight: "600", color: colors.textMuted, marginBottom: spacing.sm },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
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
    createBtn: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: "center",
    },
    createBtnDisabled: { opacity: 0.7 },
    createBtnText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  });
}
