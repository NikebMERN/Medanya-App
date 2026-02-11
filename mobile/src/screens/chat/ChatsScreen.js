import React, { useEffect, useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
  Alert,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useDebounce } from "../../hooks/useDebounce";
import { useChatStore } from "../../store/chat.store";
import { useAuthStore } from "../../store/auth.store";
import * as chatApi from "../../services/chat.api";
import * as userApi from "../../api/user.api";
import { ensureChatSocket } from "../../realtime/chat.socket";
import { formatRelative } from "../../utils/format";

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;
const USER_SEARCH_LIMIT = 100;

const SEARCH_SCOPE_ALL = "all";
const SEARCH_SCOPE_CONTACTS = "contacts";
const SEARCH_SCOPE_PUBLIC = "public";

export default function ChatsScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchTerm = useDebounce(searchQuery.trim(), SEARCH_DEBOUNCE_MS);
  const [searchScope, setSearchScope] = useState(SEARCH_SCOPE_ALL);
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id ?? s.user?.userId) ?? "";
  const chats = useChatStore((s) => s.chats);
  const chatsLoading = useChatStore((s) => s.chatsLoading);
  const chatsError = useChatStore((s) => s.chatsError);
  const setChats = useChatStore((s) => s.setChats);
  const setChatsLoading = useChatStore((s) => s.setChatsLoading);
  const setChatsError = useChatStore((s) => s.setChatsError);

  const filteredChats = useMemo(() => {
    let list = chats;
    if (searchScope === SEARCH_SCOPE_CONTACTS) {
      list = list.filter((c) => c.type === "direct");
    } else if (searchScope === SEARCH_SCOPE_PUBLIC) {
      list = list.filter((c) => c.type === "group");
    }
    const q = (searchQuery || "").trim().toLowerCase();
    if (!q) return list;
    return list.filter((chat) => {
      const isGroup = chat.type === "group";
      const title = isGroup ? (chat.groupName || "Group") : getOtherDisplayName(chat, userId);
      const subtitle = chat.lastMessagePreview || "";
      return (
        title.toLowerCase().includes(q) ||
        subtitle.toLowerCase().includes(q)
      );
    });
  }, [chats, searchQuery, searchScope, userId]);

  useEffect(() => {
    if (!debouncedSearchTerm) {
      setUserSearchResults([]);
      setSearchError(null);
      return;
    }
    if (debouncedSearchTerm.length < MIN_SEARCH_LENGTH) {
      setUserSearchResults([]);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    setUserSearchLoading(true);
    setSearchError(null);
    console.log("[ChatsScreen] discover request:", {
      q: debouncedSearchTerm,
      limit: USER_SEARCH_LIMIT,
    });
    userApi
      .discoverUsers({ q: debouncedSearchTerm, limit: USER_SEARCH_LIMIT })
      .then((data) => {
        if (cancelled) return;
        const users = Array.isArray(data?.users) ? data.users : [];
        const seen = new Set();
        const unique = users.filter((u) => {
          const id = String(u.id ?? u.userId);
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        console.log("[ChatsScreen] discover response:", {
          total: data?.total,
          returned: users.length,
          unique: unique.length,
          sample: unique.slice(0, 5).map((u) => ({
            id: u.id ?? u.userId,
            display_name: u.display_name ?? u.displayName,
          })),
        });
        setUserSearchResults(unique);
      })
      .catch((err) => {
        if (cancelled) return;
        console.log("[ChatsScreen] discover error:", err?.response?.data || err?.message || err);
        const raw = err?.response?.data?.error?.message || err?.message || "Search failed";
        const isNetworkError =
          !err?.response &&
          (raw === "Network Error" || err?.code === "ERR_NETWORK" || err?.message === "Network Error");
        const msg = isNetworkError
          ? "Can't reach the server. On a phone or emulator, set EXPO_PUBLIC_API_URL in .env to your PC's IP (e.g. http://192.168.1.5:4001), not localhost."
          : raw;
        setSearchError(msg);
        setUserSearchResults([]);
      })
      .finally(() => {
        if (!cancelled) setUserSearchLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearchTerm]);

  const loadChats = useCallback(async () => {
    setChatsLoading(true);
    setChatsError(null);
    try {
      const res = await chatApi.listChats({ limit: 50 });
      const list = Array.isArray(res?.chats) ? res.chats : [];
      setChats(list);
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        "Failed to load chats. Check that the server is running and you're signed in.";
      setChatsError(msg);
      setChats([]);
    } finally {
      setChatsLoading(false);
    }
  }, [setChats, setChatsLoading, setChatsError]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (token) ensureChatSocket(token);
  }, [token]);

  const openUserProfile = useCallback(
    (user) => {
      const uid = user?.id ?? user?.userId;
      if (!uid || String(uid) === String(userId)) return;
      navigation.navigate("Chat", { screen: "UserProfile", params: { userId: uid } });
    },
    [userId, navigation]
  );

  const onChatPress = useCallback(
    async (user) => {
      const peerId = user.id ?? user.userId;
      const isFriend = !!(user.isFollowing && (user.followsMe ?? user.follows_me));
      if (!peerId || !isFriend) return;
      try {
        const chat = await chatApi.startDirect(peerId);
        const chatId = chat?._id ?? chat?.id;
        if (chatId) {
          loadChats();
          navigation.navigate("ChatRoom", { chatId });
        }
      } catch (e) {
        Alert.alert("Error", e?.message || "Could not start chat.");
      }
    },
    [loadChats, navigation]
  );

  const onFollowPress = useCallback(
    async (user) => {
      const uid = user.id ?? user.userId;
      if (!uid) return;
      try {
        if (user.isFollowing) {
          await userApi.unfollowUser(uid);
          setUserSearchResults((prev) =>
            prev.map((u) =>
              String(u.id ?? u.userId) === String(uid) ? { ...u, isFollowing: false } : u
            )
          );
        } else {
          await userApi.followUser(uid);
          setUserSearchResults((prev) =>
            prev.map((u) =>
              String(u.id ?? u.userId) === String(uid) ? { ...u, isFollowing: true } : u
            )
          );
        }
      } catch (e) {
        Alert.alert("Error", e?.message || "Could not update follow.");
      }
    },
    []
  );

  const onBlockPress = useCallback(
    (user) => {
      const name = user.display_name ?? user.displayName ?? "this user";
      Alert.alert(
        "Block user",
        `Block ${name}? They won't be able to message you or see your profile.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Block",
            style: "destructive",
            onPress: async () => {
              try {
                const uid = user.id ?? user.userId;
                await userApi.blockUser(uid);
                setUserSearchResults((prev) => prev.filter((u) => String(u.id ?? u.userId) !== String(uid)));
              } catch (e) {
                Alert.alert("Error", e?.message || "Could not block user.");
              }
            },
          },
        ]
      );
    },
    []
  );

  const renderItem = ({ item }) => {
    const chatId = item._id || item.id;
    const isGroup = item.type === "group";
    const title = isGroup
      ? item.groupName || "Group"
      : getOtherDisplayName(item, userId);
    const subtitle = item.lastMessagePreview || "No messages yet";

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate("ChatRoom", { chatId })}
        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{title.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {item.lastMessageAt && (
          <Text style={styles.time}>{formatRelative(item.lastMessageAt)}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const peopleList = useMemo(() => {
    const me = String(userId);
    return (userSearchResults || []).filter(
      (u) => String(u.id ?? u.userId) !== me
    );
  }, [userSearchResults, userId]);

  const hasSearchQuery = (searchQuery || "").trim().length > 0;

  const listHeader = useMemo(() => {
    if (!hasSearchQuery) return null;
    return (
      <View style={styles.peopleSection}>
        <Text style={styles.peopleSectionTitle}>People</Text>
        {userSearchLoading && (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.sm }} />
        )}
        {!userSearchLoading && searchError && (
          <Text style={styles.peopleError}>{searchError}</Text>
        )}
        {!userSearchLoading && !searchError && searchQuery.trim().length > 0 && searchQuery.trim().length < MIN_SEARCH_LENGTH && (
          <Text style={styles.peopleEmpty}>Type at least {MIN_SEARCH_LENGTH} characters to search</Text>
        )}
        {!userSearchLoading && !searchError && searchQuery.trim().length >= MIN_SEARCH_LENGTH && peopleList.length === 0 && (
          <Text style={styles.peopleEmpty}>No people found for "{searchQuery.trim()}"</Text>
        )}
        {!userSearchLoading && !searchError &&
          peopleList.map((user) => {
            const uid = user.id ?? user.userId;
            const name = user.display_name ?? user.displayName ?? `User ${uid}`;
            const avatarUrl = user.avatar_url ?? user.avatarUrl;
            const isPrivate = !!(user.account_private ?? user.accountPrivate);
            const isFriend = !!(user.isFollowing && (user.followsMe ?? user.follows_me));
            return (
              <View key={String(uid)} style={styles.userRow}>
                <TouchableOpacity
                  style={styles.userRowMain}
                  onPress={() => openUserProfile(user)}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatarWrap}>
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.userAvatar} />
                    ) : (
                      <View style={[styles.userAvatar, styles.avatarPlaceholderSmall]}>
                        <Text style={styles.avatarTextSmall}>{name.charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    {isPrivate && (
                      <View style={styles.lockIconWrap}>
                        <MaterialIcons name="lock" size={12} color={colors.textMuted} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.userName} numberOfLines={1}>{name}</Text>
                </TouchableOpacity>
                <View style={styles.userRowActions}>
                  {isFriend ? (
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => onChatPress(user)}
                      hitSlop={12}
                    >
                      <MaterialIcons name="message" size={22} color={colors.primary} />
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => onFollowPress(user)}
                        hitSlop={12}
                      >
                        <MaterialIcons
                          name={user.isFollowing ? "person-check" : "person-add"}
                          size={22}
                          color={user.isFollowing ? colors.textMuted : colors.primary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => onBlockPress(user)}
                        hitSlop={12}
                      >
                        <MaterialIcons name="block" size={20} color={colors.error || "#dc2626"} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })}
      </View>
    );
  }, [hasSearchQuery, peopleList, userSearchLoading, searchError, searchQuery, colors, openUserProfile, onChatPress, onFollowPress, onBlockPress]);

  if (chatsError) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{chatsError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadChats}>
          <Text style={styles.retryLabel}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={22} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search chats and people..."
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
        <View style={styles.scopeRow}>
          <Text style={styles.scopeLabel}>Search in:</Text>
          <View style={styles.scopeTabs}>
            <TouchableOpacity
              style={[styles.scopeTab, searchScope === SEARCH_SCOPE_ALL && styles.scopeTabActive]}
              onPress={() => setSearchScope(SEARCH_SCOPE_ALL)}
            >
              <Text style={[styles.scopeTabText, searchScope === SEARCH_SCOPE_ALL && styles.scopeTabTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scopeTab, searchScope === SEARCH_SCOPE_CONTACTS && styles.scopeTabActive]}
              onPress={() => setSearchScope(SEARCH_SCOPE_CONTACTS)}
            >
              <Text style={[styles.scopeTabText, searchScope === SEARCH_SCOPE_CONTACTS && styles.scopeTabTextActive]}>
                Contacts only
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scopeTab, searchScope === SEARCH_SCOPE_PUBLIC && styles.scopeTabActive]}
              onPress={() => setSearchScope(SEARCH_SCOPE_PUBLIC)}
            >
              <Text style={[styles.scopeTabText, searchScope === SEARCH_SCOPE_PUBLIC && styles.scopeTabTextActive]}>
                Public
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {chatsLoading && chats.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => String(item._id || item.id)}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          contentContainerStyle={
            filteredChats.length === 0 && !listHeader ? styles.emptyList : undefined
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {searchQuery.trim() || searchScope !== SEARCH_SCOPE_ALL
                ? "No chats match your search."
                : "No chats yet. Start a conversation."}
            </Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={chatsLoading}
              onRefresh={loadChats}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </View>
  );
}

function getOtherDisplayName(chat, currentUserId) {
  const participants = chat.participants || [];
  const otherId = participants.find((p) => String(p) !== String(currentUserId));
  if (!otherId) return "Chat";
  return `User ${otherId}`;
}

const searchFontFamily = Platform.select({ ios: "System", android: "Roboto" });

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    searchSection: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      paddingVertical: 4,
      fontFamily: searchFontFamily,
    },
    scopeRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    scopeLabel: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: "500",
      fontFamily: searchFontFamily,
    },
    scopeTabs: {
      flex: 1,
      flexDirection: "row",
      gap: spacing.xs,
    },
    scopeTab: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    scopeTabActive: {
      backgroundColor: colors.primary,
    },
    scopeTabText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
    },
    scopeTabTextActive: {
      color: colors.white,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.lg,
    },
    peopleSection: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    peopleSectionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textMuted,
      marginBottom: spacing.sm,
      fontFamily: searchFontFamily,
    },
    peopleEmpty: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: spacing.sm,
      fontStyle: "italic",
    },
    peopleError: {
      fontSize: 14,
      color: colors.error || "#dc2626",
      marginBottom: spacing.sm,
    },
    userRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    userRowMain: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      minWidth: 0,
    },
    userRowActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    iconBtn: {
      padding: spacing.xs,
    },
    avatarWrap: {
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
    },
    userAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    avatarPlaceholderSmall: {
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarTextSmall: {
      color: colors.white,
      fontSize: 18,
      fontWeight: "700",
    },
    lockIconWrap: {
      position: "absolute",
      bottom: -2,
      alignSelf: "center",
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 2,
    },
    userName: {
      flex: 1,
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      fontFamily: searchFontFamily,
      marginLeft: spacing.sm,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.md,
    },
    avatarText: { color: colors.white, fontSize: 18, fontWeight: "600" },
    body: { flex: 1, minWidth: 0 },
    title: { fontSize: 16, fontWeight: "600", color: colors.text },
    subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
    time: { fontSize: 12, color: colors.textMuted, marginLeft: spacing.sm },
    error: {
      color: colors.error,
      marginBottom: spacing.md,
      textAlign: "center",
    },
    retryBtn: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.primary,
      borderRadius: 8,
    },
    retryLabel: { color: colors.white, fontWeight: "600" },
    emptyList: { flexGrow: 1, justifyContent: "center", padding: spacing.lg },
    emptyText: { textAlign: "center", color: colors.textMuted, fontSize: 15 },
  });
}
