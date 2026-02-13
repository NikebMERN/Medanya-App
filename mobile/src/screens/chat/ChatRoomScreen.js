import React, { useEffect, useCallback, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
  ActionSheetIOS,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useChatStore } from "../../store/chat.store";
import { useAuthStore } from "../../store/auth.store";
import * as chatApi from "../../services/chat.api";
import * as userApi from "../../api/user.api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSocket } from "../../realtime/socket";
import {
  ensureChatSocket,
  joinChatRoom,
  sendChatMessage,
  onChatMessageNew,
  offChatMessageNew,
} from "../../realtime/chat.socket";
import { MaterialIcons } from "@expo/vector-icons";
import ChatMessage from "../../components/ChatMessage";
import ChatInput from "../../components/ChatInput";

const PAGE_SIZE = 20;

export default function ChatRoomScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const chatId = route.params?.chatId;
  const chatIdStr = String(chatId || "");
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id ?? s.user?.userId) ?? "";

  const messagesFromStore = useChatStore((s) => s.messagesByChatId[chatIdStr]);
  const emptyMessagesRef = useRef([]);
  const messages = messagesFromStore ?? emptyMessagesRef.current;
  const nextCursor = useChatStore((s) => s.nextCursorByChatId[chatIdStr]);
  const hasMore = useChatStore((s) => s.hasMoreByChatId[chatIdStr] !== false);
  const messagesLoading = useChatStore((s) => s.messagesLoading[chatIdStr]);
  const setMessages = useChatStore((s) => s.setMessages);
  const setMessagesLoading = useChatStore((s) => s.setMessagesLoading);
  const prependMessages = useChatStore((s) => s.prependMessages);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const addOptimistic = useChatStore((s) => s.addOptimistic);
  const replaceOptimistic = useChatStore((s) => s.replaceOptimistic);
  const removeOptimistic = useChatStore((s) => s.removeOptimistic);
  const updateChatInList = useChatStore((s) => s.updateChatInList);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const removeMessage = useChatStore((s) => s.removeMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);

  const handleNewMessageRef = useRef(null);
  const listRef = useRef(null);

  const [canMessage, setCanMessage] = useState(null);
  const [peerUser, setPeerUser] = useState(null);
  const [chatType, setChatType] = useState("direct");
  const [peerNickname, setPeerNickname] = useState(null);
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [chatCreatedBy, setChatCreatedBy] = useState(null);
  const [chatParticipants, setChatParticipants] = useState([]);
  const [groupInfoVisible, setGroupInfoVisible] = useState(false);
  const [groupInfoTab, setGroupInfoTab] = useState("members");
  const [zoomImageUri, setZoomImageUri] = useState(null);
  const [editGroupNameVisible, setEditGroupNameVisible] = useState(false);
  const [editGroupNameValue, setEditGroupNameValue] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const insets = useSafeAreaInsets();
  const NICKNAME_KEY = (id) => `chat_nickname_${id}`;
  const isGroupOwner = chatType === "group" && chatCreatedBy && String(chatCreatedBy) === String(userId);

  useEffect(() => {
    if (!chatId || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await chatApi.getChat(chatId);
        const chat = data?.chat ?? data;
        const type = chat?.type ?? "direct";
        const participants = chat?.participants || [];
        if (!cancelled) setChatType(type);
        if (type !== "direct") {
          if (!cancelled) {
            setCanMessage(true);
            setChatCreatedBy(chat?.createdBy ?? null);
            setChatParticipants(Array.isArray(chat?.participants) ? chat.participants : []);
            setPeerUser({
              id: null,
              displayName: chat?.groupName || "Group",
              avatarUrl: null,
            });
          }
          return;
        }
        const otherId = participants.find((p) => String(p) !== String(userId));
        if (!otherId) {
          if (!cancelled) setCanMessage(false);
          return;
        }
        const mutual = await userApi.checkMutualFollow(userId, otherId);
        if (!cancelled) setCanMessage(!!mutual);
        try {
          const profile = await userApi.getPublicProfile(otherId);
          const u = profile?.user ?? profile;
          if (!cancelled && u) {
            setPeerUser({
              id: u.id ?? otherId,
              displayName: u.display_name ?? u.displayName ?? `User ${otherId}`,
              avatarUrl: u.avatar_url ?? u.avatarUrl,
            });
          }
        } catch (_) {
          if (!cancelled) setPeerUser({ id: otherId, displayName: `User ${otherId}`, avatarUrl: null });
        }
      } catch {
        if (!cancelled) setCanMessage(false);
      }
    })();
    return () => { cancelled = true; };
  }, [chatId, userId]);

  const loadHistory = useCallback(
    async (cursor) => {
      if (!chatId) return;
      setMessagesLoading(chatId, true);
      try {
        const res = await chatApi.listMessages(chatId, {
          cursor: cursor || undefined,
          limit: PAGE_SIZE,
        });
        const list = res?.messages || [];
        const next = res?.nextCursor ?? null;
        const hasMoreNext = next !== null;
        if (cursor) {
          prependMessages(chatId, list, next, hasMoreNext);
        } else {
          setMessages(chatId, list, next, hasMoreNext);
        }
      } catch {
        setMessages(chatId, [], null, false);
      } finally {
        setMessagesLoading(chatId, false);
      }
    },
    [chatId, setMessages, setMessagesLoading, prependMessages]
  );

  useEffect(() => {
    if (!chatId) return;
    clearMessages(chatId);
    loadHistory(null);
  }, [chatId]);

  useEffect(() => {
    if (!chatId || !token) return;
    ensureChatSocket(token);
    joinChatRoom(chatId, (ack) => {
      if (ack?.ok && ack.messages?.length) {
        ack.messages.forEach((m) => appendMessage(chatId, m));
      }
    });
  }, [chatId, token]);

  useEffect(() => {
    if (!chatId) return;
    const socket = getSocket();
    if (!socket) return;
    const onConnect = () => joinChatRoom(chatId);
    socket.on("connect", onConnect);
    return () => socket.off("connect", onConnect);
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    const handler = (message) => {
      const msgChatId = String(message.chatId || message.chat);
      if (msgChatId !== String(chatId)) return;
      // Don't append our own message — we already have it from optimistic + replaceOptimistic
      if (String(message.senderId) === String(userId)) return;
      appendMessage(chatId, message);
      const preview =
        message.type === "text"
          ? (message.text || "").slice(0, 80)
          : message.type === "image"
            ? "📷 Image"
            : message.type === "video"
              ? "🎥 Video"
              : "🎙️ Voice";
      updateChatInList(chatId, {
        lastMessageAt: message.createdAt,
        lastMessagePreview: preview,
      });
    };
    handleNewMessageRef.current = handler;
    onChatMessageNew(handler);
    return () => {
      offChatMessageNew(handler);
    };
  }, [chatId, userId, appendMessage, updateChatInList]);

  useEffect(() => {
    return () => {
      offChatMessageNew(handleNewMessageRef.current);
    };
  }, []);

  const handleSend = useCallback(
    (payload) => {
      if (!chatId) return;
      const editMessageId = typeof payload === "object" ? payload?.editMessageId : null;
      if (editMessageId != null) {
        const text = (typeof payload === "object" ? payload?.text : payload) ?? "";
        const trimmed = (text || "").trim();
        if (!trimmed) return;
        updateMessage(chatId, editMessageId, { text: trimmed });
        setEditingMessage(null);
        return;
      }
      const type = typeof payload === "string" ? "text" : (payload?.type || "text");
      const text = (typeof payload === "string" ? payload : payload?.text) ?? "";
      const mediaUrl = typeof payload === "object" ? (payload?.mediaUrl ?? "") : "";
      const hasContent = type === "text" ? text.trim() : mediaUrl;
      if (!hasContent) return;
      setReplyTo(null);

      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        _id: tempId,
        pendingTempId: tempId,
        chatId,
        senderId: userId,
        type,
        text: type === "text" ? text.trim() : "",
        mediaUrl,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      addOptimistic(chatId, optimistic);
      sendChatMessage(
        { chatId, type, text: type === "text" ? text.trim() : "", mediaUrl },
        (ack) => {
          if (ack?.ok && ack.messageId) {
            replaceOptimistic(chatId, tempId, {
              _id: ack.messageId,
              chatId,
              senderId: userId,
              type,
              text: type === "text" ? text.trim() : "",
              mediaUrl,
              createdAt: ack.createdAt,
              pending: false,
            });
            const preview =
              type === "text" ? (text.trim().slice(0, 80)) : type === "image" ? "📷 Image" : type === "video" ? "🎥 Video" : "🎙️ Voice";
            updateChatInList(chatId, { lastMessageAt: ack.createdAt, lastMessagePreview: preview });
          } else {
            removeOptimistic(chatId, tempId);
          }
        }
      );
    },
    [chatId, userId, addOptimistic, replaceOptimistic, removeOptimistic, updateChatInList, updateMessage]
  );

  const loadMore = useCallback(() => {
    if (!hasMore || messagesLoading || !nextCursor) return;
    loadHistory(nextCursor);
  }, [hasMore, messagesLoading, nextCursor, loadHistory]);

  const openPeerProfile = useCallback(() => {
    if (!peerUser?.id || String(peerUser.id) === String(userId)) return;
    navigation.navigate("UserProfile", { userId: peerUser.id });
  }, [peerUser, userId, navigation]);

  useEffect(() => {
    if (!peerUser?.id || chatType !== "direct") return;
    let cancelled = false;
    AsyncStorage.getItem(NICKNAME_KEY(peerUser.id)).then((v) => {
      if (!cancelled) setPeerNickname(v || null);
    });
    return () => { cancelled = true; };
  }, [peerUser?.id, chatType]);

  const showChatOptions = useCallback(() => {
    if (chatType !== "direct" || !peerUser?.id) return;
    const name = peerNickname || peerUser.displayName || "User";
    const options = ["Block", "Unfollow", "Add nickname", "Cancel"];
    const destructiveIndex = 0;
    const cancelIndex = 3;
    if (Platform.OS === "ios" && ActionSheetIOS?.showActionSheetWithOptions) {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex: destructiveIndex, cancelButtonIndex: cancelIndex },
        (i) => {
          if (i === 0) onBlockPeer();
          else if (i === 1) onUnfollowPeer();
          else if (i === 2) {
            setNicknameInput(peerNickname || "");
            setNicknameModalVisible(true);
          }
        }
      );
    } else {
      Alert.alert("Options", name, [
        { text: "Cancel", style: "cancel" },
        { text: "Block", style: "destructive", onPress: onBlockPeer },
        { text: "Unfollow", onPress: onUnfollowPeer },
        { text: "Add nickname", onPress: () => { setNicknameInput(peerNickname || ""); setNicknameModalVisible(true); } },
      ]);
    }
  }, [chatType, peerUser, peerNickname]);

  const onBlockPeer = useCallback(async () => {
    if (!peerUser?.id) return;
    Alert.alert(
      "Block",
      `Block ${peerUser.displayName || "this user"}? They won't be able to message you or see your profile.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await userApi.blockUser(peerUser.id);
              navigation.navigate("Chat", { screen: "Chats" });
            } catch (e) {
              Alert.alert("Error", e?.message || "Could not block.");
            }
          },
        },
      ]
    );
  }, [peerUser, navigation]);

  const onUnfollowPeer = useCallback(async () => {
    if (!peerUser?.id) return;
    try {
      await userApi.unfollowUser(peerUser.id);
      Alert.alert("Done", "Unfollowed.");
    } catch (e) {
      Alert.alert("Error", e?.message || "Could not unfollow.");
    }
  }, [peerUser]);

  const saveNickname = useCallback(async () => {
    if (!peerUser?.id) return;
    const trimmed = (nicknameInput || "").trim();
    await AsyncStorage.setItem(NICKNAME_KEY(peerUser.id), trimmed || "");
    setPeerNickname(trimmed || null);
    setNicknameModalVisible(false);
    setNicknameInput("");
  }, [peerUser?.id, nicknameInput]);

  const showMessageActions = useCallback(
    (message) => {
      const msgId = message._id || message.id || message.pendingTempId;
      const isOwnMsg = String(message.senderId) === String(userId);
      const isText = message.type === "text";
      if (isOwnMsg) {
        const options = ["Delete all", "Delete for me", "Reply", "Forward", isText ? "Edit" : null, "Cancel"].filter(Boolean);
        const cancelIdx = options.length - 1;
        const run = (i) => {
          if (i === cancelIdx) return;
          if (options[i] === "Delete all" || options[i] === "Delete for me") removeMessage(chatId, msgId);
          else if (options[i] === "Reply") setReplyTo(message);
          else if (options[i] === "Forward") Alert.alert("Forward", "Coming soon.");
          else if (options[i] === "Edit") setEditingMessage(message);
        };
        if (Platform.OS === "ios" && ActionSheetIOS?.showActionSheetWithOptions) {
          ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: cancelIdx }, run);
        } else {
          Alert.alert("Message", null, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete all", onPress: () => removeMessage(chatId, msgId) },
            { text: "Delete for me", onPress: () => removeMessage(chatId, msgId) },
            { text: "Reply", onPress: () => setReplyTo(message) },
            { text: "Forward", onPress: () => Alert.alert("Forward", "Coming soon.") },
            ...(isText ? [{ text: "Edit", onPress: () => setEditingMessage(message) }] : []),
          ]);
        }
      } else {
        const options = ["Delete for me", "Reply", "Forward", "Cancel"];
        const cancelIdx = 3;
        const run = (i) => {
          if (i === 0) removeMessage(chatId, msgId);
          else if (i === 1) setReplyTo(message);
          else if (i === 2) Alert.alert("Forward", "Coming soon.");
        };
        if (Platform.OS === "ios" && ActionSheetIOS?.showActionSheetWithOptions) {
          ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: cancelIdx }, run);
        } else {
          Alert.alert("Message", null, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete for me", onPress: () => removeMessage(chatId, msgId) },
            { text: "Reply", onPress: () => setReplyTo(message) },
            { text: "Forward", onPress: () => Alert.alert("Forward", "Coming soon.") },
          ]);
        }
      }
    },
    [chatId, userId, removeMessage]
  );

  // Build list with date separators; each item is { type: 'date', key, label } or { type: 'message', key, message }
  const displayItems = useMemo(() => {
    const reversed = [...messages].reverse();
    const items = [];
    let lastDateKey = null;
    for (let i = 0; i < reversed.length; i++) {
      const msg = reversed[i];
      const createdAt = msg.createdAt ? new Date(msg.createdAt) : new Date();
      const dateKey = createdAt.toDateString();
      if (dateKey !== lastDateKey) {
        lastDateKey = dateKey;
        const now = new Date();
        const today = now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const label =
          dateKey === today
            ? "Today"
            : dateKey === yesterday.toDateString()
              ? "Yesterday"
              : createdAt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
        items.push({ type: "date", key: `date-${dateKey}`, label });
      }
      items.push({ type: "message", key: `${msg._id || msg.id || msg.pendingTempId}-${i}`, message: msg, index: i, nextMessage: reversed[i + 1] });
    }
    return items;
  }, [messages]);

  const renderItem = ({ item }) => {
    if (item.type === "date") {
      return (
        <View style={styles.dateSeparatorWrap}>
          <Text style={styles.dateSeparator}>{item.label}</Text>
        </View>
      );
    }
    const isOwn = String(item.message.senderId) === String(userId);
    const readIds = item.message.readByUserIds || (item.message.readBy || []).map((r) => (typeof r === "object" && r?.userId) ? r.userId : r);
    const readByPeer = peerUser && readIds.some((id) => String(id) === String(peerUser.id));
    const showAvatar = chatType !== "direct" && !isOwn && item.nextMessage && String(item.nextMessage.senderId) !== String(item.message.senderId);
    return (
      <ChatMessage
        message={item.message}
        isOwn={isOwn}
        pending={item.message.pending}
        showAvatarBottom={showAvatar}
        avatarUrl={peerUser && String(peerUser.id) === String(item.message.senderId) ? peerUser.avatarUrl : null}
        seen={isOwn && readByPeer}
        onLongPress={showMessageActions}
      />
    );
  };

  if (!chatId) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>No chat selected</Text>
      </View>
    );
  }

  const chatHeaderBar = (
    <View style={[styles.chatHeaderBar, { paddingTop: insets.top + spacing.sm }]}>
      <TouchableOpacity
        style={styles.chatHeaderBack}
        onPress={() => navigation.navigate("Chat", { screen: "Chats" })}
        activeOpacity={0.8}
      >
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.chatHeaderCenter}
        onPress={
          chatType === "group"
            ? () => setGroupInfoVisible(true)
            : peerUser
              ? openPeerProfile
              : undefined
        }
        activeOpacity={peerUser || chatType === "group" ? 0.8 : 1}
        disabled={!peerUser && chatType !== "group"}
      >
        {peerUser ? (
          <>
            {peerUser.avatarUrl ? (
              <Image source={{ uri: peerUser.avatarUrl }} style={styles.chatHeaderAvatar} />
            ) : (
              <View style={styles.chatHeaderAvatarPlaceholder}>
                <Text style={styles.chatHeaderAvatarLetter}>
                  {(peerUser.displayName || "?").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.chatHeaderName} numberOfLines={1}>
              {peerNickname || peerUser.displayName}
            </Text>
          </>
        ) : (
          <Text style={styles.chatHeaderName}>Loading...</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.chatHeaderRight}
        onPress={chatType === "direct" && peerUser?.id ? showChatOptions : undefined}
        activeOpacity={0.8}
        disabled={chatType !== "direct" || !peerUser?.id}
      >
        <MaterialIcons name="more-vert" size={24} color={colors.text} />
      </TouchableOpacity>
    </View>
  );

  const mediaItems = useMemo(() => {
    const media = messages.filter(
      (m) => m.type === "image" || m.type === "video" || m.type === "voice"
    );
    return [...media].sort(
      (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    );
  }, [messages]);

  const nicknameModal = (
    <Modal visible={nicknameModalVisible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={() => setNicknameModalVisible(false)}>
        <Pressable style={styles.nicknameModalBox} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.nicknameModalTitle}>Add nickname</Text>
          <TextInput
            style={styles.nicknameInput}
            placeholder={peerUser?.displayName || "Name"}
            placeholderTextColor={colors.textMuted}
            value={nicknameInput}
            onChangeText={setNicknameInput}
            autoFocus
          />
          <View style={styles.nicknameModalActions}>
            <TouchableOpacity style={styles.nicknameModalBtn} onPress={() => setNicknameModalVisible(false)}>
              <Text style={styles.nicknameModalCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.nicknameModalBtn, styles.nicknameModalBtnPrimary]} onPress={saveNickname}>
              <Text style={styles.nicknameModalSave}>Save</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const groupInfoModal = (
    <Modal visible={groupInfoVisible} animationType="slide" onRequestClose={() => setGroupInfoVisible(false)}>
      <View style={[styles.groupInfoContainer, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.groupInfoHeader}>
          <TouchableOpacity onPress={() => setGroupInfoVisible(false)} style={styles.groupInfoClose}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.groupInfoTitle}>{peerUser?.displayName || "Group"}</Text>
        </View>
        <View style={styles.groupInfoTabs}>
          <TouchableOpacity
            style={[styles.groupInfoTab, groupInfoTab === "members" && styles.groupInfoTabActive]}
            onPress={() => setGroupInfoTab("members")}
          >
            <Text style={[styles.groupInfoTabText, groupInfoTab === "members" && styles.groupInfoTabTextActive]}>Members</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.groupInfoTab, groupInfoTab === "media" && styles.groupInfoTabActive]}
            onPress={() => setGroupInfoTab("media")}
          >
            <Text style={[styles.groupInfoTabText, groupInfoTab === "media" && styles.groupInfoTabTextActive]}>Media</Text>
          </TouchableOpacity>
        </View>
        {isGroupOwner && (
          <View style={styles.groupInfoActions}>
            <TouchableOpacity
              style={styles.groupInfoActionBtn}
              onPress={() => {
                setEditGroupNameValue(peerUser?.displayName || "");
                setEditGroupNameVisible(true);
              }}
            >
              <MaterialIcons name="edit" size={20} color={colors.primary} />
              <Text style={styles.groupInfoActionText}>Edit name</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.groupInfoActionBtn}
              onPress={() => {
                setGroupInfoVisible(false);
                navigation.navigate("Chat", { screen: "AddGroupMembers", params: { chatId } });
              }}
            >
              <MaterialIcons name="person-add" size={20} color={colors.primary} />
              <Text style={styles.groupInfoActionText}>Add member</Text>
            </TouchableOpacity>
          </View>
        )}
        {!isGroupOwner && (
          <TouchableOpacity
            style={styles.groupInfoActionBtn}
            onPress={() => {
              setGroupInfoVisible(false);
              navigation.navigate("Chat", { screen: "AddGroupMembers", params: { chatId } });
            }}
          >
            <MaterialIcons name="person-add" size={20} color={colors.primary} />
            <Text style={styles.groupInfoActionText}>Add member</Text>
          </TouchableOpacity>
        )}
        <ScrollView style={styles.groupInfoScroll} contentContainerStyle={styles.groupInfoScrollContent}>
          {groupInfoTab === "members" && (
            <View style={styles.membersList}>
              {chatParticipants.map((id) => (
                <View key={String(id)} style={styles.memberRow}>
                  <View style={styles.memberAvatarPlaceholder}>
                    <Text style={styles.memberAvatarLetter}>{String(id).slice(-1)}</Text>
                  </View>
                  <Text style={styles.memberName}>User {id}</Text>
                  {String(chatCreatedBy) === String(id) && (
                    <Text style={styles.ownerBadge}>Owner</Text>
                  )}
                </View>
              ))}
            </View>
          )}
          {groupInfoTab === "media" && (
            <View style={styles.mediaGrid}>
              {mediaItems.length === 0 ? (
                <Text style={styles.mediaEmpty}>No media yet</Text>
              ) : (
                mediaItems.map((m, i) => (
                  <TouchableOpacity
                    key={(m._id || m.id || i) + (m.createdAt || "")}
                    style={styles.mediaThumb}
                    onPress={() => m.type === "image" && m.mediaUrl && setZoomImageUri(m.mediaUrl)}
                  >
                    {m.type === "image" && m.mediaUrl ? (
                      <Image source={{ uri: m.mediaUrl }} style={styles.mediaThumbImage} resizeMode="cover" />
                    ) : m.type === "video" && m.mediaUrl ? (
                      <View style={styles.mediaThumbPlaceholder}>
                        <MaterialIcons name="videocam" size={32} color={colors.textMuted} />
                      </View>
                    ) : m.type === "voice" ? (
                      <View style={styles.mediaThumbPlaceholder}>
                        <MaterialIcons name="mic" size={32} color={colors.textMuted} />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  const imageZoomModal = (
    <Modal visible={!!zoomImageUri} transparent animationType="fade">
      <Pressable style={styles.zoomOverlay} onPress={() => setZoomImageUri(null)}>
        {zoomImageUri ? (
          <Image source={{ uri: zoomImageUri }} style={styles.zoomImage} resizeMode="contain" />
        ) : null}
        <TouchableOpacity style={styles.zoomClose} onPress={() => setZoomImageUri(null)}>
          <MaterialIcons name="close" size={28} color={colors.white} />
        </TouchableOpacity>
      </Pressable>
    </Modal>
  );

  const saveGroupName = useCallback(async () => {
    const name = (editGroupNameValue || "").trim();
    if (!name || !chatId) return;
    try {
      await chatApi.setGroupName(chatId, name);
      setPeerUser((p) => (p ? { ...p, displayName: name } : p));
      setEditGroupNameVisible(false);
      setGroupInfoVisible(false);
    } catch (e) {
      Alert.alert("Error", e?.message || "Could not update name.");
    }
  }, [chatId, editGroupNameValue]);

  const editGroupNameModal = (
    <Modal visible={editGroupNameVisible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={() => setEditGroupNameVisible(false)}>
        <Pressable style={styles.nicknameModalBox} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.nicknameModalTitle}>Edit group name</Text>
          <TextInput
            style={styles.nicknameInput}
            placeholder="Group name"
            placeholderTextColor={colors.textMuted}
            value={editGroupNameValue}
            onChangeText={setEditGroupNameValue}
            autoFocus
          />
          <View style={styles.nicknameModalActions}>
            <TouchableOpacity style={styles.nicknameModalBtn} onPress={() => setEditGroupNameVisible(false)}>
              <Text style={styles.nicknameModalCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.nicknameModalBtn, styles.nicknameModalBtnPrimary]} onPress={saveGroupName}>
              <Text style={styles.nicknameModalSave}>Save</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {nicknameModal}
      {editGroupNameModal}
      {groupInfoModal}
      {imageZoomModal}
      {chatHeaderBar}
      {messagesLoading && messages.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={displayItems}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          inverted
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            messagesLoading && messages.length > 0 ? (
              <View style={styles.loader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No message yet</Text>
            </View>
          }
        />
      )}
      {canMessage === false && (
        <View style={styles.mutualBanner}>
          <Text style={styles.mutualBannerText}>
            You need to follow each other to message. Follow them from their profile first.
          </Text>
        </View>
      )}
      <ChatInput
        onSend={handleSend}
        disabled={!token || canMessage === false}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
      />
    </KeyboardAvoidingView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    chatHeaderBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    chatHeaderBack: {
      padding: spacing.sm,
      marginRight: spacing.xs,
    },
    chatHeaderCenter: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      minWidth: 0,
    },
    chatHeaderAvatar: { width: 40, height: 40, borderRadius: 20 },
    chatHeaderAvatarPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    chatHeaderAvatarLetter: { color: colors.white, fontSize: 18, fontWeight: "700" },
    chatHeaderName: { flex: 1, fontSize: 17, fontWeight: "600", color: colors.text },
    chatHeaderRight: { padding: spacing.sm },
    dateSeparatorWrap: {
      alignItems: "center",
      paddingVertical: spacing.md,
    },
    dateSeparator: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "600",
    },
    headerScrollWrap: { backgroundColor: colors.surface },
    backRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      gap: spacing.xs,
    },
    backLabel: { fontSize: 17, fontWeight: "600", color: colors.text },
    profileBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.sm,
    },
    profileBarAvatar: { width: 40, height: 40, borderRadius: 20 },
    profileBarAvatarPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    profileBarAvatarLetter: { color: colors.white, fontSize: 18, fontWeight: "700" },
    profileBarName: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    loader: { padding: spacing.md, alignItems: "center" },
    empty: { padding: spacing.xl, alignItems: "center" },
    emptyText: { color: colors.textMuted, fontSize: 15 },
    error: { color: colors.error },
    mutualBanner: {
      backgroundColor: colors.warning || "#f59e0b",
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    mutualBannerText: {
      color: colors.white,
      fontSize: 14,
      textAlign: "center",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.lg,
    },
    nicknameModalBox: {
      width: "100%",
      maxWidth: 320,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.lg,
    },
    nicknameModalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: spacing.md,
    },
    nicknameInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 16,
      color: colors.text,
      marginBottom: spacing.md,
    },
    nicknameModalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: spacing.sm,
    },
    nicknameModalBtn: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    nicknameModalBtnPrimary: {
      backgroundColor: colors.primary,
      borderRadius: 10,
    },
    nicknameModalCancel: { fontSize: 16, color: colors.textMuted },
    nicknameModalSave: { fontSize: 16, fontWeight: "600", color: colors.white },
    groupInfoContainer: { flex: 1, backgroundColor: colors.background },
    groupInfoHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    groupInfoClose: { padding: spacing.sm, marginRight: spacing.sm },
    groupInfoTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.text },
    groupInfoTabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border },
    groupInfoTab: { flex: 1, paddingVertical: spacing.md, alignItems: "center" },
    groupInfoTabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
    groupInfoTabText: { fontSize: 15, color: colors.textMuted },
    groupInfoTabTextActive: { color: colors.primary, fontWeight: "600" },
    groupInfoActions: { flexDirection: "row", flexWrap: "wrap", padding: spacing.md, gap: spacing.sm },
    groupInfoActionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    groupInfoActionText: { fontSize: 15, color: colors.primary, fontWeight: "600" },
    groupInfoScroll: { flex: 1 },
    groupInfoScrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
    membersList: { gap: spacing.sm },
    memberRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.sm,
    },
    memberAvatarPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    memberAvatarLetter: { color: colors.white, fontSize: 18, fontWeight: "700" },
    memberName: { flex: 1, fontSize: 16, color: colors.text },
    ownerBadge: { fontSize: 12, color: colors.primary, fontWeight: "600" },
    mediaGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    mediaThumb: { width: "31%", aspectRatio: 1, borderRadius: 8, overflow: "hidden" },
    mediaThumbImage: { width: "100%", height: "100%" },
    mediaThumbPlaceholder: {
      width: "100%",
      height: "100%",
      backgroundColor: colors.surfaceLight,
      justifyContent: "center",
      alignItems: "center",
    },
    mediaEmpty: { fontSize: 15, color: colors.textMuted, paddingVertical: spacing.xl },
    zoomOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.9)",
      justifyContent: "center",
      alignItems: "center",
    },
    zoomImage: { width: "100%", height: "100%" },
    zoomClose: {
      position: "absolute",
      top: 50,
      right: spacing.md,
      padding: spacing.sm,
      backgroundColor: "rgba(255,255,255,0.2)",
      borderRadius: 22,
    },
  });
}
