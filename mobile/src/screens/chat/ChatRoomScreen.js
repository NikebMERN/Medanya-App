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
  Switch,
  useWindowDimensions,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
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
  markMessagesRead,
  onChatMessageReadReceipt,
  offChatMessageReadReceipt,
} from "../../realtime/chat.socket";
import { MaterialIcons } from "@expo/vector-icons";
import ChatMessage from "../../components/ChatMessage";
import ChatInput from "../../components/ChatInput";
import { useThemeStore } from "../../store/theme.store";
import { uploadToCloudinary } from "../../utils/env";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

const PAGE_SIZE = 20;

function ZoomImageItem({ uri, width, height }) {
  const [loaded, setLoaded] = React.useState(false);
  return (
    <View style={{ width, height, justifyContent: "center", alignItems: "center" }}>
      <Image
        source={{ uri }}
        style={{ width: "100%", height: "100%", minWidth: 200, minHeight: 200 }}
        resizeMode="contain"
        onLoadStart={() => setLoaded(false)}
        onLoadEnd={() => setLoaded(true)}
      />
      {!loaded && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: "center", alignItems: "center" }]}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
}

export default function ChatRoomScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
  const removeChatFromList = useChatStore((s) => s.removeChatFromList);
  const addBlockedUserId = useChatStore((s) => s.addBlockedUserId);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const removeMessage = useChatStore((s) => s.removeMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const setCurrentChatId = useChatStore((s) => s.setCurrentChatId);
  const markChatAsRead = useChatStore((s) => s.markChatAsRead);

  const listRef = useRef(null);

  const [canMessage, setCanMessage] = useState(null);
  const [peerUser, setPeerUser] = useState(null);
  const [chatType, setChatType] = useState("direct");
  const [peerNickname, setPeerNickname] = useState(null);
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [chatCreatedBy, setChatCreatedBy] = useState(null);
  const [chatParticipants, setChatParticipants] = useState([]);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [isChannel, setIsChannel] = useState(false);
  const [groupAvatarUrl, setGroupAvatarUrl] = useState("");
  const [membersCanEditProfile, setMembersCanEditProfile] = useState(false);
  const [membersCanSendMessages, setMembersCanSendMessages] = useState(false);
  const [membersCanEditChannel, setMembersCanEditChannel] = useState(false);
  const [groupInfoVisible, setGroupInfoVisible] = useState(false);
  const [groupInfoTab, setGroupInfoTab] = useState("members");
  const [zoomGalleryOpen, setZoomGalleryOpen] = useState(false);
  const [zoomGalleryInitialIndex, setZoomGalleryInitialIndex] = useState(0);
  const [chatSegmentIndex, setChatSegmentIndex] = useState(0);
  const chatScrollRef = useRef(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollCheckRef = useRef(null);
  const insets = useSafeAreaInsets();
  const chats = useChatStore((s) => s.chats);
  const blockedUserIds = useChatStore((s) => s.blockedUserIds) || [];
  const currentUser = useAuthStore((s) => s.user);
  const currentUserAvatarUrl = currentUser?.avatar_url ?? currentUser?.avatarUrl;
  const currentUserDisplayName = currentUser?.display_name ?? currentUser?.displayName;
  const NICKNAME_KEY = (id) => `chat_nickname_${id}`;
  const isGroupOwner = chatType === "group" && chatCreatedBy && String(chatCreatedBy) === String(userId);
  const canEditGroupProfile = isGroupOwner || (isChannel ? membersCanEditChannel : membersCanEditProfile);
  const canSendInChannel = !isChannel || isGroupOwner || membersCanSendMessages;
  const peerIsBlocked = peerUser?.id != null && blockedUserIds.includes(String(peerUser.id));
  const peerDisplayName = peerIsBlocked ? "medanya_user" : (peerUser?.displayName || "User");
  const peerAvatarUrl = peerIsBlocked ? null : (peerUser?.avatarUrl ?? null);

  useEffect(() => {
    if (chatType !== "group" || !chatParticipants.length) return;
    let cancelled = false;
    chatParticipants.forEach((id) => {
      const idStr = String(id);
      userApi.getPublicProfile(id).then((data) => {
        if (cancelled) return;
        const u = data?.user ?? data;
        setMemberProfiles((prev) => ({
          ...prev,
          [idStr]: {
            displayName: u?.display_name ?? u?.displayName ?? `User ${idStr}`,
            avatarUrl: u?.avatar_url ?? u?.avatarUrl,
          },
        }));
      }).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [chatType, chatParticipants.join(",")]);

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
            setIsChannel(!!chat?.isChannel);
            setPeerUser({
              id: null,
              displayName: chat?.groupName || "Group",
              avatarUrl: chat?.groupAvatarUrl || null,
            });
            setGroupAvatarUrl(chat?.groupAvatarUrl || "");
            setMembersCanEditProfile(!!chat?.membersCanEditProfile);
            setMembersCanSendMessages(!!chat?.membersCanSendMessages);
            setMembersCanEditChannel(!!chat?.membersCanEditChannel);
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

  useFocusEffect(
    useCallback(() => {
      if (!chatId || !userId || chatType !== "group") return;
      let cancelled = false;
      (async () => {
        try {
          const data = await chatApi.getChat(chatId);
          const chat = data?.chat ?? data;
          if (cancelled) return;
          setPeerUser((p) =>
            p ? { ...p, displayName: chat?.groupName || "Group", avatarUrl: chat?.groupAvatarUrl || null } : p
          );
          setGroupAvatarUrl(chat?.groupAvatarUrl || "");
          updateChatInList(chatId, { groupName: chat?.groupName, groupAvatarUrl: chat?.groupAvatarUrl });
        } catch (_) {}
      })();
      return () => { cancelled = true; };
    }, [chatId, userId, chatType, updateChatInList])
  );

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
          const state = useChatStore.getState();
          const current = state.messagesByChatId[String(chatId)] || [];
          const pending = current.filter((m) => m.pendingTempId || m.uploading);
          setMessages(chatId, [...list, ...pending], next, hasMoreNext);
          const unreadIds = list
            .filter((m) => String(m.senderId) !== String(userId))
            .filter((m) => !(m.readByUserIds || []).includes(String(userId)))
            .map((m) => m._id || m.id)
            .filter(Boolean);
          if (unreadIds.length > 0) {
            markMessagesRead({ chatId, messageIds: unreadIds }, (ack) => {
              if (ack?.ok) {
                unreadIds.forEach((mid) => {
                  const msg = list.find((m) => (m._id || m.id) === mid);
                  if (msg) {
                    const ids = [...new Set([...(msg.readByUserIds || []), String(userId)])];
                    updateMessage(chatId, mid, { readByUserIds: ids });
                  }
                });
              }
            });
          }
        }
      } catch {
        const state = useChatStore.getState();
        const current = state.messagesByChatId[String(chatId)] || [];
        const pending = current.filter((m) => m.pendingTempId || m.uploading);
        setMessages(chatId, pending.length ? pending : [], null, false);
      } finally {
        setMessagesLoading(chatId, false);
      }
    },
    [chatId, userId, setMessages, setMessagesLoading, prependMessages, updateMessage]
  );

  useEffect(() => {
    if (!chatId) return;
    loadHistory(null);
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    setCurrentChatId(chatId);
    markChatAsRead(chatId);
    return () => setCurrentChatId(null);
  }, [chatId, setCurrentChatId, markChatAsRead]);

  useEffect(() => {
    if (!chatId || !token) return;
    ensureChatSocket(token);
    const socket = getSocket();
    if (!socket) return;
    const ack = (res) => {
      if (res?.ok && res.messages?.length) {
        res.messages.forEach((m) => appendMessage(chatId, m));
      }
    };
    if (socket.connected) {
      joinChatRoom(chatId, ack);
    } else {
      const once = () => joinChatRoom(chatId, ack);
      socket.once("connect", once);
      return () => socket.off("connect", once);
    }
  }, [chatId, token, appendMessage]);

  useEffect(() => {
    const handler = ({ messageIds, readByUserId }) => {
      if (!chatId || !messageIds?.length || !readByUserId) return;
      messageIds.forEach((mid) => {
        const list = useChatStore.getState().messagesByChatId[String(chatId)] || [];
        const msg = list.find((m) => String(m._id || m.id) === String(mid));
        if (msg && String(msg.senderId) === String(userId)) {
          const ids = [...new Set([...(msg.readByUserIds || []), String(readByUserId)])];
          updateMessage(chatId, mid, { readByUserIds: ids });
        }
      });
    };
    onChatMessageReadReceipt(handler);
    return () => offChatMessageReadReceipt(handler);
  }, [chatId, userId, updateMessage]);

  const onMediaPicked = useCallback(
    (uri, type) => {
      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        _id: tempId,
        pendingTempId: tempId,
        chatId,
        senderId: userId,
        type,
        text: "",
        mediaUrl: uri,
        createdAt: new Date().toISOString(),
        pending: true,
        uploading: true,
      };
      addOptimistic(chatId, optimistic);
      return tempId;
    },
    [chatId, userId, addOptimistic]
  );

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
      const existingTempId = typeof payload === "object" ? payload?.tempId : null;
      const hasContent = type === "text" ? text.trim() : mediaUrl || (["location", "poll", "contact", "profile"].includes(type) && text.trim());
      if (!hasContent) return;
      setReplyTo(null);

      const tempId = existingTempId || `temp-${Date.now()}`;
      if (!existingTempId) {
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
      } else {
        updateMessage(chatId, tempId, { mediaUrl, uploading: false });
      }
      sendChatMessage(
        {
          chatId,
          type,
          text: ["text", "location", "poll", "contact", "profile"].includes(type) ? (text || "").trim() : "",
          mediaUrl: ["image", "video", "voice", "file"].includes(type) ? mediaUrl : "",
        },
        (ack) => {
          if (ack?.ok && ack.messageId) {
            replaceOptimistic(chatId, tempId, {
              _id: ack.messageId,
              chatId,
              senderId: userId,
              type,
              text: ["text", "location", "poll", "contact", "profile"].includes(type) ? (text || "").trim() : "",
              mediaUrl: ["image", "video", "voice", "file"].includes(type) ? mediaUrl : "",
              createdAt: ack.createdAt,
              pending: false,
            });
            const preview =
              type === "text" ? (text.trim().slice(0, 80)) : type === "image" ? "📷 Image" : type === "video" ? "🎥 Video" : type === "voice" ? "🎙️ Voice" : type === "file" ? "📎 File" : type === "location" ? "📍 Location" : type === "poll" ? "📊 Poll" : type === "contact" ? "👤 Contact" : type === "profile" ? "👤 Profile" : "Message";
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

  const onProfilePress = useCallback((msg) => {
    let uid = msg?.userId;
    if (uid == null && msg?.type === "profile" && msg?.text) {
      try {
        const p = JSON.parse(msg.text);
        uid = p.userId ?? p.id;
      } catch (_) {}
    }
    if (uid) {
      setGroupInfoVisible(false);
      navigation.navigate("UserProfile", { userId: String(uid) });
    }
  }, [navigation]);

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
    const name = peerDisplayName || "this user";
    Alert.alert(
      "Block",
      `Block ${name}? They won't be able to message you or see your profile.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await userApi.blockUser(peerUser.id);
              addBlockedUserId(peerUser.id);
              navigation.navigate("Chat", { screen: "Chats" });
            } catch (e) {
              Alert.alert("Error", e?.message || "Could not block.");
            }
          },
        },
      ]
    );
  }, [peerUser, peerDisplayName, navigation, addBlockedUserId]);

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

  const updateChatPreviewFromMessages = useCallback(
    (msgs) => {
      if (!chatId) return;
      const list = (msgs || []).filter((m) => !m.pending);
      const last = list.length > 0 ? list[list.length - 1] : null;
      if (!last) {
        updateChatInList(chatId, { lastMessagePreview: "", lastMessageAt: null });
        return;
      }
      const type = last.type || "text";
      const preview =
        type === "text"
          ? (last.text || "").slice(0, 80)
          : type === "image"
            ? "📷 Image"
            : type === "video"
              ? "🎥 Video"
              : type === "voice"
                ? "🎙️ Voice"
                : type === "file"
                  ? "📎 File"
                  : type === "location"
                    ? "📍 Location"
                    : type === "poll"
                      ? "📊 Poll"
                      : type === "contact"
                        ? "👤 Contact"
                        : type === "profile"
                          ? "👤 Profile"
                          : "Message";
      updateChatInList(chatId, { lastMessagePreview: preview, lastMessageAt: last.createdAt });
    },
    [chatId, updateChatInList]
  );

  const handleDeleteForAll = useCallback(
    async (msgId) => {
      if (!msgId || !chatId) return;
      try {
        await chatApi.deleteMessageForAll(chatId, msgId);
        removeMessage(chatId, msgId);
        const remaining = useChatStore.getState().messagesByChatId[String(chatId)] || [];
        updateChatPreviewFromMessages(remaining);
      } catch (e) {
        Alert.alert("Error", e?.response?.data?.error?.message || e?.message || "Could not delete for everyone.");
      }
    },
    [chatId, removeMessage, updateChatPreviewFromMessages]
  );

  const handleDeleteForMe = useCallback(
    async (msgId) => {
      if (!msgId || !chatId) return;
      try {
        await chatApi.deleteMessageForMe(chatId, msgId);
        removeMessage(chatId, msgId);
        const remaining = useChatStore.getState().messagesByChatId[String(chatId)] || [];
        updateChatPreviewFromMessages(remaining);
      } catch (e) {
        Alert.alert("Error", e?.response?.data?.error?.message || e?.message || "Could not delete for you.");
      }
    },
    [chatId, removeMessage, updateChatPreviewFromMessages]
  );

  const onVotePoll = useCallback(
    async (messageId, optionIndex) => {
      if (!chatId) return;
      try {
        const data = await chatApi.votePoll(chatId, messageId, optionIndex);
        updateMessage(chatId, messageId, {
          pollOptionCounts: data.pollOptionCounts,
          pollTotalVotes: data.pollTotalVotes,
          pollUserVote: data.pollUserVote,
        });
      } catch (e) {
        Alert.alert("Error", e?.response?.data?.error?.message || e?.message || "Could not vote.");
      }
    },
    [chatId, updateMessage]
  );

  const handleSaveMedia = useCallback(async (mediaUrl, type) => {
    if (!mediaUrl) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow access to save to your gallery.");
        return;
      }
      const ext = type === "image" ? "jpg" : type === "video" ? "mp4" : "file";
      const filename = `${FileSystem.cacheDirectory}save_${Date.now()}.${ext}`;
      const { uri: localUri } = await FileSystem.downloadAsync(mediaUrl, filename);
      if (type === "image" || type === "video") {
        try {
          await MediaLibrary.saveToLibraryAsync(localUri);
        } catch (saveErr) {
          if (Platform.OS === "ios" && typeof MediaLibrary.createAssetAsync === "function") {
            await MediaLibrary.createAssetAsync(localUri);
          } else {
            throw saveErr;
          }
        }
        Alert.alert("Saved", type === "image" ? "Image saved to gallery." : "Video saved to gallery.");
      } else {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(localUri, { mimeType: "application/octet-stream", dialogTitle: "Save file" });
        } else {
          Alert.alert("Saved", "File saved. You can open it from the app cache.");
        }
      }
    } catch (e) {
      Alert.alert("Error", e?.message || "Could not save.");
    }
  }, []);

  const showMessageActions = useCallback(
    (message) => {
      const msgId = message._id || message.id || message.pendingTempId;
      const isOwnMsg = String(message.senderId) === String(userId);
      const isText = message.type === "text";
      const hasMedia = (message.type === "image" || message.type === "video" || message.type === "file") && (message.mediaUrl || message.media_url);
      const mediaUrl = message.mediaUrl || message.media_url;
      const mediaType = message.type;
      if (isOwnMsg) {
        const options = ["Delete all", "Delete for me", "Reply", "Forward", hasMedia ? "Save" : null, isText ? "Edit" : null, "Cancel"].filter(Boolean);
        const cancelIdx = options.length - 1;
        const run = (i) => {
          if (i === cancelIdx) return;
          if (options[i] === "Delete all") handleDeleteForAll(msgId);
          else if (options[i] === "Delete for me") handleDeleteForMe(msgId);
          else if (options[i] === "Reply") setReplyTo(message);
          else if (options[i] === "Forward") setForwardMessage(message);
          else if (options[i] === "Save") handleSaveMedia(mediaUrl, mediaType);
          else if (options[i] === "Edit") setEditingMessage(message);
        };
        if (Platform.OS === "ios" && ActionSheetIOS?.showActionSheetWithOptions) {
          ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: cancelIdx }, run);
        } else {
          Alert.alert("Message", null, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete all", onPress: () => handleDeleteForAll(msgId) },
            { text: "Delete for me", onPress: () => handleDeleteForMe(msgId) },
            { text: "Reply", onPress: () => setReplyTo(message) },
            { text: "Forward", onPress: () => setForwardMessage(message) },
            ...(hasMedia ? [{ text: "Save", onPress: () => handleSaveMedia(mediaUrl, mediaType) }] : []),
            ...(isText ? [{ text: "Edit", onPress: () => setEditingMessage(message) }] : []),
          ]);
        }
      } else {
        const options = ["Delete for me", "Reply", "Forward", hasMedia ? "Save" : null, "Cancel"].filter(Boolean);
        const cancelIdx = options.length - 1;
        const run = (i) => {
          if (i === cancelIdx) return;
          if (options[i] === "Delete for me") handleDeleteForMe(msgId);
          else if (options[i] === "Reply") setReplyTo(message);
          else if (options[i] === "Forward") setForwardMessage(message);
          else if (options[i] === "Save") handleSaveMedia(mediaUrl, mediaType);
        };
        if (Platform.OS === "ios" && ActionSheetIOS?.showActionSheetWithOptions) {
          ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: cancelIdx }, run);
        } else {
          Alert.alert("Message", null, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete for me", onPress: () => handleDeleteForMe(msgId) },
            { text: "Reply", onPress: () => setReplyTo(message) },
            { text: "Forward", onPress: () => setForwardMessage(message) },
            ...(hasMedia ? [{ text: "Save", onPress: () => handleSaveMedia(mediaUrl, mediaType) }] : []),
          ]);
        }
      }
    },
    [chatId, userId, removeMessage, handleDeleteForAll, handleDeleteForMe, handleSaveMedia]
  );

  const forwardToChat = useCallback(
    (targetChatId) => {
      if (!forwardMessage) return;
      const payload = {
        chatId: targetChatId,
        type: forwardMessage.type || "text",
        text: forwardMessage.text || "",
        mediaUrl: forwardMessage.mediaUrl || "",
      };
      sendChatMessage(payload);
      setForwardMessage(null);
    },
    [forwardMessage, sendChatMessage]
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

  const renderItem = useCallback(({ item }) => {
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
    const senderIdStr = String(item.message.senderId);
    const isLastInStreak = !isOwn && (!item.nextMessage || String(item.nextMessage.senderId) !== senderIdStr);
    const avatarUrlForSender = chatType === "direct"
      ? (peerUser && String(peerUser.id) === senderIdStr ? peerUser.avatarUrl : null)
      : (memberProfiles[senderIdStr]?.avatarUrl ?? null);
    return (
      <ChatMessage
        message={item.message}
        isOwn={isOwn}
        pending={item.message.pending}
        showAvatarBottom={isLastInStreak}
        avatarUrl={avatarUrlForSender}
        seen={isOwn && readByPeer}
        onLongPress={showMessageActions}
        onMediaPress={openZoomGallery}
        onProfilePress={onProfilePress}
        onVotePoll={onVotePoll}
        isGroupChat={chatType === "group"}
      />
    );
  }, [userId, peerUser, memberProfiles, chatType, styles, showMessageActions, openZoomGallery, onProfilePress, onVotePoll]);

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
            {peerAvatarUrl ? (
              <Image source={{ uri: peerAvatarUrl }} style={styles.chatHeaderAvatar} />
            ) : (
              <View style={styles.chatHeaderAvatarPlaceholder}>
                <Text style={styles.chatHeaderAvatarLetter}>
                  {(peerDisplayName || "?").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.chatHeaderName} numberOfLines={1}>
              {peerNickname || peerDisplayName}
            </Text>
          </>
        ) : (
          <Text style={styles.chatHeaderName}>Loading...</Text>
        )}
      </TouchableOpacity>
      <View style={styles.chatHeaderRight}>
        {chatType === "group" ? (
          <TouchableOpacity
            style={styles.chatHeaderIconBtn}
            onPress={() => {
              const options = ["Group info", "Media", ...(isGroupOwner ? ["Add members"] : []), "Cancel"].filter(Boolean);
              const cancelIdx = options.length - 1;
              const run = (i) => {
                if (i === cancelIdx) return;
                if (options[i] === "Group info") setGroupInfoVisible(true);
                else if (options[i] === "Media") { setGroupInfoVisible(true); setGroupInfoTab("media"); }
                else if (options[i] === "Add members") {
                  navigation.navigate("AddGroupMembers", { chatId });
                }
              };
              if (Platform.OS === "ios" && ActionSheetIOS?.showActionSheetWithOptions) {
                ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: cancelIdx }, run);
              } else {
                Alert.alert("Group", null, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Group info", onPress: () => setGroupInfoVisible(true) },
                  { text: "Media", onPress: () => { setGroupInfoVisible(true); setGroupInfoTab("media"); } },
                  ...(isGroupOwner ? [{ text: "Add members", onPress: () => navigation.navigate("AddGroupMembers", { chatId }) }] : []),
                ]);
              }
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="more-vert" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : peerUser?.id ? (
          <TouchableOpacity style={styles.chatHeaderIconBtn} onPress={showChatOptions} activeOpacity={0.8}>
            <MaterialIcons name="more-vert" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : null}
      </View>
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

  const imageOnlyItems = useMemo(() => mediaItems.filter((m) => m.type === "image"), [mediaItems]);

  const openZoomGallery = useCallback((uriOrIndex) => {
    if (typeof uriOrIndex === "number") {
      setZoomGalleryInitialIndex(Math.max(0, Math.min(uriOrIndex, imageOnlyItems.length - 1)));
      const item = imageOnlyItems[uriOrIndex];
      if (item?.mediaUrl) Image.prefetch(item.mediaUrl);
    } else {
      const idx = imageOnlyItems.findIndex((m) => m.mediaUrl === uriOrIndex);
      setZoomGalleryInitialIndex(idx >= 0 ? idx : 0);
      if (typeof uriOrIndex === "string") Image.prefetch(uriOrIndex);
    }
    setZoomGalleryOpen(true);
  }, [imageOnlyItems]);

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
        <View style={styles.groupInfoAvatarSection}>
          <View style={styles.groupInfoAvatarWrap}>
            {(peerUser?.avatarUrl || groupAvatarUrl) ? (
              <Image source={{ uri: peerUser?.avatarUrl || groupAvatarUrl }} style={styles.groupInfoAvatar} />
            ) : (
              <View style={[styles.groupInfoAvatar, styles.groupInfoAvatarPlaceholder]}>
                <Text style={styles.groupInfoAvatarLetter}>{(peerUser?.displayName || "G").charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.groupInfoTabs}>
          <TouchableOpacity
            style={[styles.groupInfoTab, groupInfoTab === "members" && styles.groupInfoTabActive]}
            onPress={() => setGroupInfoTab("members")}
          >
            <Text style={[styles.groupInfoTabText, groupInfoTab === "members" && styles.groupInfoTabTextActive]}>{isChannel ? "Owner" : "Members"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.groupInfoTab, groupInfoTab === "media" && styles.groupInfoTabActive]}
            onPress={() => setGroupInfoTab("media")}
          >
            <Text style={[styles.groupInfoTabText, groupInfoTab === "media" && styles.groupInfoTabTextActive]}>Media</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.groupInfoActions}>
          {canEditGroupProfile && (
            <TouchableOpacity
              style={styles.groupInfoActionBtn}
              onPress={() => {
                setGroupInfoVisible(false);
                const screen = isChannel ? "EditChannel" : "EditGroup";
                navigation.navigate(screen, {
                  chatId,
                  groupName: peerUser?.displayName || "",
                  groupAvatarUrl: peerUser?.avatarUrl || groupAvatarUrl || "",
                });
              }}
            >
              <MaterialIcons name="edit" size={20} color={colors.primary} />
              <Text style={styles.groupInfoActionText}>Edit {isChannel ? "channel" : "group"}</Text>
            </TouchableOpacity>
          )}
          {isGroupOwner && (
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
        </View>
        {isGroupOwner && (
          <View style={styles.groupInfoPermissions}>
            <Text style={styles.groupInfoPermissionsTitle}>Permissions</Text>
            {!isChannel && (
              <View style={styles.groupInfoPermissionRow}>
                <Text style={styles.groupInfoPermissionLabel}>Members can edit name & photo</Text>
                <Switch
                  value={membersCanEditProfile}
                  onValueChange={(v) => setPermission("membersCanEditProfile", v)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.white}
                />
              </View>
            )}
            {isChannel && (
              <>
                <View style={styles.groupInfoPermissionRow}>
                  <Text style={styles.groupInfoPermissionLabel}>Members can send messages</Text>
                  <Switch
                    value={membersCanSendMessages}
                    onValueChange={(v) => setPermission("membersCanSendMessages", v)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.white}
                  />
                </View>
                <View style={styles.groupInfoPermissionRow}>
                  <Text style={styles.groupInfoPermissionLabel}>Members can edit channel name & photo</Text>
                  <Switch
                    value={membersCanEditChannel}
                    onValueChange={(v) => setPermission("membersCanEditChannel", v)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.white}
                  />
                </View>
              </>
            )}
          </View>
        )}
        <ScrollView style={styles.groupInfoScroll} contentContainerStyle={styles.groupInfoScrollContent}>
          {groupInfoTab === "members" && !isChannel && (
            <View style={styles.membersList}>
              {/* Me row first with "Write me" */}
              <TouchableOpacity
                style={styles.memberRow}
                onPress={() => {
                  setGroupInfoVisible(false);
                  navigation.getParent?.()?.navigate?.("Profile", { screen: "EditProfile", params: { user: currentUser } });
                }}
                activeOpacity={0.7}
              >
                {currentUserAvatarUrl ? (
                  <Image source={{ uri: currentUserAvatarUrl }} style={styles.memberAvatar} />
                ) : (
                  <View style={styles.memberAvatarPlaceholder}>
                    <Text style={styles.memberAvatarLetter}>{(currentUserDisplayName || "Me").charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <Text style={styles.memberName} numberOfLines={1}>{currentUserDisplayName || "Me"}</Text>
                <Text style={styles.writeMeBadge}>Write me</Text>
              </TouchableOpacity>
              {chatParticipants.filter((id) => String(id) !== String(userId)).map((id) => {
                const profile = memberProfiles[String(id)];
                const name = profile?.displayName ?? profile?.display_name ?? `User ${id}`;
                const avatarUrl = profile?.avatarUrl ?? profile?.avatar_url;
                return (
                  <TouchableOpacity
                    key={String(id)}
                    style={styles.memberRow}
                    onPress={() => {
                      setGroupInfoVisible(false);
                      navigation.navigate("UserProfile", { userId: id });
                    }}
                    activeOpacity={0.7}
                  >
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.memberAvatar} />
                    ) : (
                      <View style={styles.memberAvatarPlaceholder}>
                        <Text style={styles.memberAvatarLetter}>{(name || String(id)).charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <Text style={styles.memberName} numberOfLines={1}>{name}</Text>
                    {String(chatCreatedBy) === String(id) && (
                      <Text style={styles.ownerBadge}>Owner</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {groupInfoTab === "members" && isChannel && (
            <View style={styles.membersList}>
              {/* Me row with "Write me" */}
              <TouchableOpacity
                style={styles.memberRow}
                onPress={() => {
                  setGroupInfoVisible(false);
                  navigation.getParent?.()?.navigate?.("Profile", { screen: "EditProfile", params: { user: currentUser } });
                }}
                activeOpacity={0.7}
              >
                {currentUserAvatarUrl ? (
                  <Image source={{ uri: currentUserAvatarUrl }} style={styles.memberAvatar} />
                ) : (
                  <View style={styles.memberAvatarPlaceholder}>
                    <Text style={styles.memberAvatarLetter}>{(currentUserDisplayName || "Me").charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <Text style={styles.memberName} numberOfLines={1}>{currentUserDisplayName || "Me"}</Text>
                <Text style={styles.writeMeBadge}>Write me</Text>
              </TouchableOpacity>
              {chatCreatedBy ? (
                <TouchableOpacity
                  style={styles.memberRow}
                  onPress={() => {
                    setGroupInfoVisible(false);
                    navigation.navigate("UserProfile", { userId: chatCreatedBy });
                  }}
                  activeOpacity={0.7}
                >
                  {memberProfiles[String(chatCreatedBy)]?.avatarUrl ? (
                    <Image source={{ uri: memberProfiles[String(chatCreatedBy)].avatarUrl }} style={styles.memberAvatar} />
                  ) : (
                    <View style={styles.memberAvatarPlaceholder}>
                      <Text style={styles.memberAvatarLetter}>
                        {(memberProfiles[String(chatCreatedBy)]?.displayName || String(chatCreatedBy)).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.memberName}>
                    {memberProfiles[String(chatCreatedBy)]?.displayName ?? "Owner"}
                  </Text>
                  <Text style={styles.ownerBadge}>Owner</Text>
                </TouchableOpacity>
              ) : null}
              <Text style={styles.channelMembersNote}>Channel members are not listed.</Text>
            </View>
          )}
          <View style={styles.groupInfoDangerZone}>
            <TouchableOpacity
              style={[styles.groupInfoDangerBtn, styles.groupInfoLeaveBtn]}
              onPress={() => {
                Alert.alert(
                  "Leave " + (isChannel ? "channel" : "group"),
                  `Are you sure you want to leave ${peerUser?.displayName || (isChannel ? "this channel" : "this group")}?`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Leave",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          await chatApi.leaveGroup(chatId);
                          removeChatFromList(chatId);
                          clearMessages(chatId);
                          setGroupInfoVisible(false);
                          navigation.navigate("Chat", { screen: "Chats" });
                        } catch (e) {
                          Alert.alert("Error", e?.response?.data?.error?.message || e?.message || "Could not leave.");
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.groupInfoLeaveBtnText}>Leave {isChannel ? "channel" : "group"}</Text>
            </TouchableOpacity>
            {isGroupOwner && (
              <TouchableOpacity
                style={[styles.groupInfoDangerBtn, styles.groupInfoDeleteBtn]}
                onPress={() => {
                  Alert.alert(
                    "Delete " + (isChannel ? "channel" : "group"),
                    `Permanently delete ${peerUser?.displayName || (isChannel ? "this channel" : "this group")} and all messages? This cannot be undone.`,
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: async () => {
                          try {
                            await chatApi.deleteGroup(chatId);
                            removeChatFromList(chatId);
                            clearMessages(chatId);
                            setGroupInfoVisible(false);
                            navigation.navigate("Chat", { screen: "Chats" });
                          } catch (e) {
                            Alert.alert("Error", e?.response?.data?.error?.message || e?.message || "Could not delete.");
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.groupInfoDeleteBtnText}>Delete {isChannel ? "channel" : "group"}</Text>
              </TouchableOpacity>
            )}
          </View>
          {groupInfoTab === "media" && (
            <View style={styles.mediaGrid}>
              {mediaItems.length === 0 ? (
                <Text style={styles.mediaEmpty}>No media yet</Text>
              ) : (
                mediaItems.map((m, i) => (
                  <TouchableOpacity
                    key={(m._id || m.id || i) + (m.createdAt || "")}
                    style={styles.mediaThumb}
                    onPress={() => m.type === "image" && m.mediaUrl && openZoomGallery(m.mediaUrl)}
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
    <Modal visible={zoomGalleryOpen} transparent animationType="none">
      <View style={styles.zoomOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setZoomGalleryOpen(false)} />
        {imageOnlyItems.length > 0 ? (
          <FlatList
            data={imageOnlyItems}
            keyExtractor={(item, idx) => (item._id || item.id || idx) + (item.mediaUrl || "")}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={Math.min(zoomGalleryInitialIndex, Math.max(0, imageOnlyItems.length - 1))}
            initialNumToRender={3}
            maxToRenderPerBatch={2}
            windowSize={5}
            removeClippedSubviews={true}
            getItemLayout={(_, index) => ({ length: windowWidth, offset: windowWidth * index, index })}
            style={styles.zoomGalleryList}
            renderItem={({ item }) => (
              <ZoomImageItem uri={item.mediaUrl} width={windowWidth} height={windowHeight} />
            )}
          />
        ) : null}
        <TouchableOpacity style={styles.zoomClose} onPress={() => setZoomGalleryOpen(false)} activeOpacity={0.8}>
          <MaterialIcons name="close" size={28} color={colors.white} />
        </TouchableOpacity>
      </View>
    </Modal>
  );

  const setPermission = useCallback(async (key, value) => {
    if (!chatId || !isGroupOwner) return;
    const payload = { [key]: value };
    try {
      await chatApi.setGroupPermissions(chatId, payload);
      if (key === "membersCanEditProfile") setMembersCanEditProfile(value);
      if (key === "membersCanSendMessages") setMembersCanSendMessages(value);
      if (key === "membersCanEditChannel") setMembersCanEditChannel(value);
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.error?.message || e?.message || "Could not update permission.");
    }
  }, [chatId, isGroupOwner]);

  const tabNav = navigation.getParent?.() ?? navigation;
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const logout = useAuthStore((s) => s.logout);
  const accountPrivate = currentUser?.account_private ?? currentUser?.accountPrivate;
  const profileMenuModal = (
    <Modal visible={profileMenuVisible} transparent animationType="fade" onRequestClose={() => setProfileMenuVisible(false)}>
      <Pressable style={styles.menuOverlay} onPress={() => setProfileMenuVisible(false)}>
        <Pressable style={[styles.profileMenuSheet, { paddingBottom: insets.bottom + spacing.md }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.menuHandle} />
          <TouchableOpacity style={styles.menuItem} onPress={() => { setProfileMenuVisible(false); tabNav.navigate("Profile", { screen: "EditProfile", params: { user: currentUser } }); }}>
            <MaterialIcons name="edit" size={22} color={colors.text} />
            <Text style={styles.menuItemText}>Edit profile</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          {accountPrivate && (
            <TouchableOpacity style={styles.menuItem} onPress={() => { setProfileMenuVisible(false); tabNav.navigate("Profile", { screen: "FollowRequests" }); }}>
              <MaterialIcons name="people-outline" size={22} color={colors.text} />
              <Text style={styles.menuItemText}>Follow requests</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.menuItem} onPress={() => { setProfileMenuVisible(false); tabNav.navigate("Chat", { screen: "CreateGroup" }); }}>
            <MaterialIcons name="group-add" size={22} color={colors.text} />
            <Text style={styles.menuItemText}>Create a group chat</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setProfileMenuVisible(false); tabNav.navigate("Chat", { screen: "CreateChannel" }); }}>
            <MaterialIcons name="campaign" size={22} color={colors.text} />
            <Text style={styles.menuItemText}>Create a channel</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setProfileMenuVisible(false); tabNav.navigate("Chat", { screen: "SearchJoinGroup" }); }}>
            <MaterialIcons name="search" size={22} color={colors.text} />
            <Text style={styles.menuItemText}>Search & join group</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setProfileMenuVisible(false); tabNav.navigate("Profile", { screen: "BlockedUsers" }); }}>
            <MaterialIcons name="block" size={22} color={colors.text} />
            <Text style={styles.menuItemText}>Blacklist</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setTheme(theme === "dark" ? "light" : "dark"); setProfileMenuVisible(false); }}>
            <MaterialIcons name={theme === "dark" ? "light-mode" : "dark-mode"} size={22} color={colors.text} />
            <Text style={styles.menuItemText}>{theme === "dark" ? "Light mode" : "Dark mode"}</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={() => { setProfileMenuVisible(false); logout(); }}>
            <MaterialIcons name="logout" size={22} color={colors.error || "#e53935"} />
            <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Log out</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const otherChats = useMemo(
    () => (chats || []).filter((c) => String(c._id || c.id) !== String(chatId)),
    [chats, chatId]
  );

  const forwardModal = (
    <Modal
      visible={!!forwardMessage}
      transparent
      animationType="slide"
      onRequestClose={() => setForwardMessage(null)}
    >
      <Pressable style={styles.menuOverlay} onPress={() => setForwardMessage(null)}>
        <Pressable style={[styles.profileMenuSheet, { paddingBottom: insets.bottom + spacing.md }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.menuHandle} />
          <Text style={[styles.menuItemText, { marginBottom: spacing.sm }]}>Forward to</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {otherChats.length === 0 ? (
              <Text style={[styles.menuItemText, { color: colors.textMuted }]}>No other chats</Text>
            ) : (
              otherChats.map((c) => {
                const cid = c._id || c.id;
                const title = c.type === "group" ? (c.groupName || "Group") : "Direct chat";
                return (
                  <TouchableOpacity
                    key={cid}
                    style={styles.menuItem}
                    onPress={() => forwardToChat(cid)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.menuItemText}>{title}</Text>
                    <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
          <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={() => setForwardMessage(null)}>
            <Text style={styles.menuItemText}>Cancel</Text>
          </TouchableOpacity>
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
      {groupInfoModal}
      {imageZoomModal}
      {profileMenuModal}
      {forwardModal}
      {chatHeaderBar}
      <View style={styles.chatSegmentBar}>
        <TouchableOpacity
          style={[styles.chatSegmentTab, chatSegmentIndex === 0 && styles.chatSegmentTabActive]}
          onPress={() => {
            setChatSegmentIndex(0);
            chatScrollRef.current?.scrollTo({ x: 0, animated: true });
          }}
        >
          <MaterialIcons name="chat" size={20} color={chatSegmentIndex === 0 ? colors.primary : colors.textMuted} />
          <Text style={[styles.chatSegmentLabel, chatSegmentIndex === 0 && styles.chatSegmentLabelActive]}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chatSegmentTab, chatSegmentIndex === 1 && styles.chatSegmentTabActive]}
          onPress={() => {
            setChatSegmentIndex(1);
            chatScrollRef.current?.scrollTo({ x: windowWidth, animated: true });
          }}
        >
          <MaterialIcons name="photo-library" size={20} color={chatSegmentIndex === 1 ? colors.primary : colors.textMuted} />
          <Text style={[styles.chatSegmentLabel, chatSegmentIndex === 1 && styles.chatSegmentLabelActive]}>Photos & Videos</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        ref={chatScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
          setChatSegmentIndex(i);
        }}
        style={styles.chatSegmentScroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.chatSegmentPage, { width: windowWidth }]}>
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
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              windowSize={10}
              removeClippedSubviews={Platform.OS !== "web"}
              onScroll={(e) => {
                const y = e?.nativeEvent?.contentOffset?.y ?? 0;
                const shouldShow = y > 80;
                if (scrollCheckRef.current) clearTimeout(scrollCheckRef.current);
                scrollCheckRef.current = setTimeout(() => {
                  setShowScrollToBottom(shouldShow);
                  scrollCheckRef.current = null;
                }, 150);
              }}
              scrollEventThrottle={80}
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
          {showScrollToBottom && (
            <TouchableOpacity
              style={[styles.scrollToBottomFab, { backgroundColor: colors.primary }]}
              onPress={() => {
                listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
                setShowScrollToBottom(false);
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="keyboard-arrow-down" size={28} color="#fff" />
            </TouchableOpacity>
          )}
          {canSendInChannel && (
            <ChatInput
              onSend={handleSend}
              disabled={!token || canMessage === false}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              editingMessage={editingMessage}
              onCancelEdit={() => setEditingMessage(null)}
              onMediaPicked={onMediaPicked}
            />
          )}
        </View>
        <View style={[styles.chatSegmentPage, { width: windowWidth }]}>
          <ScrollView contentContainerStyle={styles.mediaPageContent}>
            {mediaItems.length === 0 ? (
              <Text style={styles.mediaEmpty}>No photos or videos yet</Text>
            ) : (
              <View style={styles.mediaGrid}>
                {mediaItems.map((m, i) => (
                  <TouchableOpacity
                    key={(m._id || m.id || i) + (m.createdAt || "")}
                    style={styles.mediaThumb}
                    onPress={() => m.type === "image" && m.mediaUrl && openZoomGallery(m.mediaUrl)}
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
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>
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
    chatHeaderRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      padding: spacing.sm,
    },
    chatHeaderIconBtn: { padding: spacing.xs },
    chatHeaderAvatarBtn: {},
    chatHeaderMyAvatar: { width: 36, height: 36, borderRadius: 18 },
    chatHeaderMyAvatarPlaceholder: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceLight,
      justifyContent: "center",
      alignItems: "center",
    },
    chatHeaderMyAvatarLetter: { fontSize: 14, fontWeight: "700", color: colors.text },
    menuOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    profileMenuSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    menuHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: spacing.md,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuItemText: {
      flex: 1,
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    menuItemDanger: { borderBottomWidth: 0, marginTop: spacing.sm },
    menuItemTextDanger: { color: colors.error || "#e53935" },
    dateSeparatorWrap: {
      alignItems: "center",
      paddingVertical: spacing.md,
    },
    dateSeparator: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "600",
      backgroundColor: (colors.surfaceLight || colors.border || "#e5e5e5"),
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: 12,
      overflow: "hidden",
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
    chatSegmentBar: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    chatSegmentTab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingVertical: spacing.sm,
    },
    chatSegmentTabActive: {
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    chatSegmentLabel: { fontSize: 15, color: colors.textMuted },
    chatSegmentLabelActive: { color: colors.primary, fontWeight: "600" },
    chatSegmentScroll: { flex: 1 },
    chatSegmentPage: { flex: 1 },
    scrollToBottomFab: {
      position: "absolute",
      bottom: 88,
      right: spacing.md,
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    mediaPageContent: {
      padding: spacing.md,
      paddingBottom: spacing.xl * 2,
    },
    mediaGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    mediaThumb: {
      width: "31%",
      aspectRatio: 1,
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: colors.border,
    },
    mediaThumbImage: { width: "100%", height: "100%" },
    mediaThumbPlaceholder: {
      width: "100%",
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
    },
    mediaEmpty: {
      color: colors.textMuted,
      fontSize: 15,
      textAlign: "center",
      paddingVertical: spacing.xl,
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
    groupInfoAvatarSection: { alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    groupInfoAvatarWrap: { position: "relative" },
    groupInfoAvatar: { width: 88, height: 88, borderRadius: 44 },
    groupInfoAvatarPlaceholder: { backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" },
    groupInfoAvatarLetter: { fontSize: 36, fontWeight: "700", color: colors.white },
    groupInfoAvatarOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 44, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
    groupInfoAvatarEditBadge: { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" },
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
    groupInfoPermissions: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    groupInfoPermissionsTitle: { fontSize: 14, fontWeight: "700", color: colors.textMuted, marginBottom: spacing.sm },
    groupInfoPermissionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm },
    groupInfoPermissionLabel: { flex: 1, fontSize: 15, color: colors.text, marginRight: spacing.sm },
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
    memberAvatar: { width: 40, height: 40, borderRadius: 20 },
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
    writeMeBadge: { fontSize: 12, color: colors.primary, fontWeight: "600" },
    channelMembersNote: { fontSize: 14, color: colors.textMuted, padding: spacing.md },
    groupInfoDangerZone: { marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
    groupInfoDangerBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: 12, alignItems: "center" },
    groupInfoLeaveBtn: { backgroundColor: "rgba(245,158,11,0.15)" },
    groupInfoLeaveBtnText: { fontSize: 16, fontWeight: "600", color: colors.warning || "#f59e0b" },
    groupInfoDeleteBtn: { backgroundColor: "rgba(229,57,53,0.15)" },
    groupInfoDeleteBtnText: { fontSize: 16, fontWeight: "600", color: colors.error || "#e53935" },
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
    zoomGalleryList: { flex: 1 },
    zoomGalleryPage: { justifyContent: "center", alignItems: "center" },
    zoomScrollView: { flex: 1, width: "100%" },
    zoomScrollContent: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
    zoomImage: { width: "100%", height: "100%", minWidth: 200, minHeight: 200 },
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
