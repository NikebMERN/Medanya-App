import React, { useEffect, useCallback, useMemo, useState, useRef } from "react";
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
  Modal,
  Pressable,
  Animated,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useDebounce } from "../../hooks/useDebounce";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useChatStore, HIDDEN_CHATS_KEY } from "../../store/chat.store";
import { useAuthStore } from "../../store/auth.store";
import * as chatApi from "../../services/chat.api";
import * as userApi from "../../api/user.api";
import { ensureChatSocket } from "../../realtime/chat.socket";
import { formatRelative } from "../../utils/format";
import { typography } from "../../theme/typography";

const SEARCH_DEBOUNCE_MS = 300;
const USER_SEARCH_LIMIT = 100;

const SEARCH_SCOPE_ALL = "all";
const SEARCH_SCOPE_CONTACTS = "contacts";
const SEARCH_SCOPE_PUBLIC = "public";

export default function ChatsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
  const participantProfiles = useChatStore((s) => s.participantProfiles);
  const setParticipantProfile = useChatStore((s) => s.setParticipantProfile);
  const removeChatFromList = useChatStore((s) => s.removeChatFromList);
  const setHiddenChatIds = useChatStore((s) => s.setHiddenChatIds);
  const addHiddenChatId = useChatStore((s) => s.addHiddenChatId);
  const hiddenChatIds = useChatStore((s) => s.hiddenChatIds);
  const setBlockedUserIds = useChatStore((s) => s.setBlockedUserIds);
  const addBlockedUserId = useChatStore((s) => s.addBlockedUserId);
  const blockedUserIds = useChatStore((s) => s.blockedUserIds);
  const unreadByChatId = useChatStore((s) => s.unreadByChatId) || {};

  const [chatMenuChatId, setChatMenuChatId] = useState(null);
  const chatMenuAnim = useRef(new Animated.Value(0)).current;

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
      const title = isGroup ? (chat.groupName || "Group") : getOtherDisplayName(chat, userId, participantProfiles, blockedUserIds);
      const subtitle = chat.lastMessagePreview || "";
      return (
        title.toLowerCase().includes(q) ||
        subtitle.toLowerCase().includes(q)
      );
    });
  }, [chats, searchQuery, searchScope, userId, participantProfiles, blockedUserIds]);

  useEffect(() => {
    if (!debouncedSearchTerm) {
      setUserSearchResults([]);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    setUserSearchLoading(true);
    setSearchError(null);
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
        setUserSearchResults(unique);
      })
      .catch((err) => {
        if (cancelled) return;
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

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(HIDDEN_CHATS_KEY)
      .then((raw) => {
        if (!mounted) return;
        try {
          const ids = raw ? JSON.parse(raw) : [];
          if (Array.isArray(ids)) setHiddenChatIds(ids);
        } catch (_) {}
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [setHiddenChatIds]);

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

  // Load blocked users in background so chat list and profile pics show immediately
  useEffect(() => {
    let cancelled = false;
    userApi
      .getBlockedUsers({ limit: 200 })
      .then((data) => {
        if (!cancelled && Array.isArray(data?.users))
          setBlockedUserIds(data.users.map((u) => String(u.id ?? u.userId)));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [setBlockedUserIds]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (route.params?.refresh != null) loadChats();
  }, [route.params?.refresh, loadChats]);

  // Resolve display names for direct chat participants (stored in chat store so they persist when list reorders)
  useEffect(() => {
    if (!chats?.length || !userId) return;
    let cancelled = false;
    const directChats = chats.filter((c) => c.type === "direct");
    const otherIds = [
      ...new Set(
        directChats
          .map((c) => (c.participants || []).find((p) => String(p) !== String(userId)))
          .filter(Boolean)
      ),
    ];
    otherIds.forEach((otherId) => {
      const idStr = String(otherId);
      if (participantProfiles[idStr]) return;
      userApi
        .getPublicProfile(otherId)
        .then((data) => {
          if (cancelled) return;
          const u = data?.user ?? data;
          setParticipantProfile(otherId, {
            displayName: u?.display_name ?? u?.displayName ?? `User ${idStr}`,
            avatarUrl: u?.avatar_url ?? u?.avatarUrl,
          });
        })
        .catch(() => {
          if (!cancelled)
            setParticipantProfile(otherId, { displayName: `User ${idStr}`, avatarUrl: null });
        });
    });
    return () => { cancelled = true; };
  }, [chats, userId, setParticipantProfile]);

  useEffect(() => {
    if (token) ensureChatSocket(token);
  }, [token]);

  const menuChat = useMemo(
    () => (chatMenuChatId ? filteredChats.find((c) => String(c._id || c.id) === String(chatMenuChatId)) : null),
    [chatMenuChatId, filteredChats]
  );
  const menuOtherId = menuChat?.type === "direct"
    ? (menuChat.participants || []).find((p) => String(p) !== String(userId))
    : null;
  const menuDisplayName = menuOtherId
    ? ((blockedUserIds || []).includes(String(menuOtherId)) ? "medanya_user" : (participantProfiles[String(menuOtherId)]?.displayName ?? `User ${menuOtherId}`))
    : "";

  useEffect(() => {
    if (chatMenuChatId) {
      chatMenuAnim.setValue(0);
      Animated.spring(chatMenuAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    }
  }, [chatMenuChatId, chatMenuAnim]);

  const closeChatMenu = useCallback(() => {
    Animated.timing(chatMenuAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setChatMenuChatId(null));
  }, [chatMenuAnim]);

  const onMenuUnfollow = useCallback(async () => {
    if (!menuOtherId) return;
    closeChatMenu();
    try {
      await userApi.unfollowUser(menuOtherId);
      loadChats();
    } catch (e) {
      Alert.alert("Error", e?.message || "Could not unfollow.");
    }
  }, [menuOtherId, closeChatMenu, loadChats]);

  const onMenuBlock = useCallback(() => {
    const name = menuDisplayName || "this user";
    const otherId = menuOtherId;
    const cid = chatMenuChatId;
    closeChatMenu();
    Alert.alert(
      "Block user",
      `Block ${name}? They won't be able to message you or see your profile.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            if (!otherId || !cid) return;
            try {
              await userApi.blockUser(otherId);
              addBlockedUserId(otherId);
              removeChatFromList(cid);
              loadChats();
            } catch (e) {
              Alert.alert("Error", e?.message || "Could not block user.");
            }
          },
        },
      ]
    );
  }, [menuOtherId, menuDisplayName, chatMenuChatId, closeChatMenu, loadChats, removeChatFromList, addBlockedUserId]);

  const onMenuDeleteChat = useCallback(() => {
    const cid = chatMenuChatId;
    closeChatMenu();
    Alert.alert(
      "Delete chat",
      "Remove this conversation from your chat list?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!cid) return;
            const next = addHiddenChatId(cid);
            try {
              await AsyncStorage.setItem(HIDDEN_CHATS_KEY, JSON.stringify(next));
            } catch (_) {}
          },
        },
      ]
    );
  }, [chatMenuChatId, closeChatMenu, addHiddenChatId]);

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

  const openMessageWithUser = useCallback(
    async (user) => {
      const uid = user?.id ?? user?.userId;
      if (!uid || String(uid) === String(userId)) return;
      const isFriend = !!(user.isFollowing && (user.followsMe ?? user.follows_me));
      if (!isFriend) return;
      try {
        const chat = await chatApi.startDirect(uid);
        const chatId = chat?._id ?? chat?.id;
        if (chatId) {
          loadChats();
          navigation.navigate("ChatRoom", { chatId });
        }
      } catch (e) {
        Alert.alert("Error", e?.message || "Could not start chat.");
      }
    },
    [userId, loadChats, navigation]
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
    const chatIdStr = String(chatId);
    const isGroup = item.type === "group";
    const title = isGroup
      ? item.groupName || "Group"
      : getOtherDisplayName(item, userId, participantProfiles, blockedUserIds);
    const subtitle = item.lastMessagePreview || "No message yet";
    const otherId = !isGroup && (item.participants || []).find((p) => String(p) !== String(userId));
    const isBlocked = otherId && (blockedUserIds || []).includes(String(otherId));
    const profile = otherId ? participantProfiles[String(otherId)] : null;
    const avatarUrl = isBlocked ? null : profile?.avatarUrl;
    const unread = Math.max(0, Number(unreadByChatId[chatIdStr]) || 0);

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate("ChatRoom", { chatId })}
        onLongPress={() => !isGroup && setChatMenuChatId(chatId)}
        activeOpacity={0.7}
        delayLongPress={400}
      >
        <View style={styles.rowAvatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.chatRowAvatar} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{title.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          {unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount} numberOfLines={1}>{unread > 99 ? "99+" : unread}</Text>
            </View>
          )}
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
    let list = (userSearchResults || []).filter(
      (u) => String(u.id ?? u.userId) !== me
    );
    if (searchScope === SEARCH_SCOPE_CONTACTS) {
      list = list.filter((u) => u.isFollowing && (u.followsMe ?? u.follows_me));
    } else if (searchScope === SEARCH_SCOPE_PUBLIC) {
      list = list.filter((u) => !u.isFollowing);
    }
    return list;
  }, [userSearchResults, userId, searchScope]);

  const hasSearchQuery = (searchQuery || "").trim().length > 0;

  const renderPersonRow = useCallback(
    ({ item: user }) => {
      const uid = user.id ?? user.userId;
      const name = user.display_name ?? user.displayName ?? `User ${uid}`;
      const avatarUrl = user.avatar_url ?? user.avatarUrl;
      const isPrivate = !!(user.account_private ?? user.accountPrivate);
      const isFriend = !!(user.isFollowing && (user.followsMe ?? user.follows_me));
      return (
        <View style={styles.userRow}>
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
                onPress={() => openMessageWithUser(user)}
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
    },
    [colors, openUserProfile, openMessageWithUser, onFollowPress, onBlockPress, styles]
  );

  const searchListHeader = useMemo(() => {
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
      </View>
    );
  }, [hasSearchQuery, userSearchLoading, searchError, colors, styles]);

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

      {chatsLoading && chats.length === 0 && !hasSearchQuery ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={hasSearchQuery ? peopleList : filteredChats}
          keyExtractor={(item) =>
            hasSearchQuery ? String(item.id ?? item.userId) : String(item._id || item.id)
          }
          renderItem={hasSearchQuery ? renderPersonRow : renderItem}
          ListHeaderComponent={hasSearchQuery ? searchListHeader : null}
          contentContainerStyle={
            (hasSearchQuery ? peopleList.length === 0 : filteredChats.length === 0) &&
            !searchListHeader
              ? styles.emptyList
              : undefined
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
                {hasSearchQuery
                  ? !userSearchLoading && searchQuery.trim()
                    ? 'No people found for "' + searchQuery.trim() + '"'
                    : "Search for people above."
                  : searchQuery.trim() || searchScope !== SEARCH_SCOPE_ALL
                    ? "No chats match your search."
                    : "No chats yet. Start a conversation or search for a group to join."}
              </Text>
              {!hasSearchQuery && !searchQuery.trim() && searchScope === SEARCH_SCOPE_ALL ? (
                <TouchableOpacity
                  style={styles.searchGroupBtn}
                  onPress={() => navigation.navigate("SearchJoinGroup")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.searchGroupBtnText}>Search & join group</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={hasSearchQuery ? userSearchLoading : chatsLoading}
              onRefresh={hasSearchQuery ? () => {} : loadChats}
              colors={[colors.primary]}
            />
          }
        />
      )}

      <Modal visible={!!chatMenuChatId} transparent animationType="fade" onRequestClose={closeChatMenu}>
        <Pressable style={styles.chatMenuOverlay} onPress={closeChatMenu}>
          <Pressable onPress={() => {}} style={styles.chatMenuDropdownWrap}>
            <Animated.View
              style={[
                styles.chatMenuDropdown,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: chatMenuAnim,
                  transform: [
                    { translateY: chatMenuAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
                    { scale: chatMenuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
                  ],
                },
              ]}
            >
            <TouchableOpacity style={styles.chatMenuItem} onPress={onMenuUnfollow} activeOpacity={0.7}>
              <MaterialIcons name="person-remove" size={22} color={colors.text} />
              <Text style={[styles.chatMenuItemText, { color: colors.text }]}>Unfollow</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chatMenuItem} onPress={onMenuBlock} activeOpacity={0.7}>
              <MaterialIcons name="block" size={22} color={colors.error || "#dc2626"} />
              <Text style={[styles.chatMenuItemText, { color: colors.error || "#dc2626" }]}>Block</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chatMenuItem} onPress={onMenuDeleteChat} activeOpacity={0.7}>
              <MaterialIcons name="delete-outline" size={22} color={colors.text} />
              <Text style={[styles.chatMenuItemText, { color: colors.text }]}>Delete chat</Text>
            </TouchableOpacity>
          </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function getOtherDisplayName(chat, currentUserId, participantProfiles = {}, blockedUserIds = []) {
  const participants = chat.participants || [];
  const otherId = participants.find((p) => String(p) !== String(currentUserId));
  if (!otherId) return "Chat";
  if (blockedUserIds.includes(String(otherId))) return "medanya_user";
  const profile = participantProfiles[String(otherId)];
  return profile?.displayName ?? `User ${otherId}`;
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
      fontStyle: typography.fontStyle,
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
    rowAvatarWrap: {
      position: "relative",
      marginRight: spacing.md,
    },
    chatRowAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surfaceLight,
    },
    unreadBadge: {
      position: "absolute",
      top: -2,
      right: -2,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "#3b82f6",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 6,
    },
    unreadCount: {
      color: "#fff",
      fontSize: 11,
      fontWeight: "700",
    },
    avatarText: { color: colors.white, fontSize: 18, fontWeight: "600" },
    body: { flex: 1, minWidth: 0 },
    title: { fontSize: 16, fontWeight: "600", color: colors.text, fontStyle: typography.fontStyle },
    subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2, fontStyle: typography.fontStyle },
    time: { fontSize: 12, color: colors.textMuted, marginLeft: spacing.sm, fontStyle: typography.fontStyle },
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
    retryLabel: { color: colors.white, fontWeight: "600", fontStyle: typography.fontStyle },
    emptyList: { flexGrow: 1, justifyContent: "center", padding: spacing.lg },
    emptyWrap: { alignItems: "center", padding: spacing.lg },
    emptyText: { textAlign: "center", color: colors.textMuted, fontSize: 15, fontStyle: typography.fontStyle, marginBottom: spacing.md },
    searchGroupBtn: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.primary,
      borderRadius: 10,
    },
    searchGroupBtnText: { color: colors.white, fontWeight: "600", fontSize: 14 },
    chatMenuOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.lg,
    },
    chatMenuDropdownWrap: { width: "100%", maxWidth: 280, alignItems: "center" },
    chatMenuDropdown: {
      width: "100%",
      maxWidth: 280,
      borderRadius: 16,
      borderWidth: 1,
      overflow: "hidden",
      paddingVertical: spacing.xs,
    },
    chatMenuItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    chatMenuItemText: { fontSize: 16, fontWeight: "500" },
  });
}
