import React, { useEffect, useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useHeaderBack } from "../../context/HeaderBackContext";
import { useThemeColors } from "../../theme/useThemeColors";
import { spacing } from "../../theme/spacing";
import { useChatStore } from "../../store/chat.store";
import { useAuthStore } from "../../store/auth.store";
import * as chatApi from "../../services/chat.api";
import * as userApi from "../../api/user.api";
import { ensureChatSocket, getSocket } from "../../realtime/socket";
import {
  joinChatRoom,
  sendChatMessage,
  onChatMessageNew,
  offChatMessageNew,
} from "../../realtime/chat.socket";
import ChatMessage from "../../components/ChatMessage";
import ChatInput from "../../components/ChatInput";

const PAGE_SIZE = 20;

export default function ChatRoomScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const chatId = route.params?.chatId;
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id ?? s.user?.userId) ?? "";

  const messages = useChatStore((s) => s.getMessages(chatId));
  const nextCursor = useChatStore((s) => s.getNextCursor(chatId));
  const hasMore = useChatStore((s) => s.getHasMore(chatId));
  const messagesLoading = useChatStore((s) => s.messagesLoading[String(chatId)]);
  const setMessages = useChatStore((s) => s.setMessages);
  const setMessagesLoading = useChatStore((s) => s.setMessagesLoading);
  const prependMessages = useChatStore((s) => s.prependMessages);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const addOptimistic = useChatStore((s) => s.addOptimistic);
  const replaceOptimistic = useChatStore((s) => s.replaceOptimistic);
  const removeOptimistic = useChatStore((s) => s.removeOptimistic);
  const updateChatInList = useChatStore((s) => s.updateChatInList);
  const clearMessages = useChatStore((s) => s.clearMessages);

  const handleNewMessageRef = useRef(null);
  const listRef = useRef(null);
  const { setBackHandler } = useHeaderBack() || {};

  const [canMessage, setCanMessage] = useState(null);

  useEffect(() => {
    if (!chatId || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await chatApi.getChat(chatId);
        const chat = data?.chat ?? data;
        const type = chat?.type;
        const participants = chat?.participants || [];
        if (type !== "direct") {
          if (!cancelled) setCanMessage(true);
          return;
        }
        const otherId = participants.find((p) => String(p) !== String(userId));
        if (!otherId) {
          if (!cancelled) setCanMessage(false);
          return;
        }
        const mutual = await userApi.checkMutualFollow(userId, otherId);
        if (!cancelled) setCanMessage(!!mutual);
      } catch {
        if (!cancelled) setCanMessage(false);
      }
    })();
    return () => { cancelled = true; };
  }, [chatId, userId]);

  useEffect(() => {
    if (!setBackHandler) return;
    setBackHandler(() => navigation.goBack());
    return () => setBackHandler(null);
  }, [navigation, setBackHandler]);

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
  }, [chatId, appendMessage, updateChatInList]);

  useEffect(() => {
    return () => {
      offChatMessageNew(handleNewMessageRef.current);
    };
  }, []);

  const handleSend = useCallback(
    (text) => {
      if (!text.trim() || !chatId) return;
      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        _id: tempId,
        pendingTempId: tempId,
        chatId,
        senderId: userId,
        type: "text",
        text: text.trim(),
        mediaUrl: "",
        createdAt: new Date().toISOString(),
        pending: true,
      };
      addOptimistic(chatId, optimistic);
      sendChatMessage(
        { chatId, type: "text", text: text.trim() },
        (ack) => {
          if (ack?.ok && ack.messageId) {
            replaceOptimistic(chatId, tempId, {
              _id: ack.messageId,
              chatId,
              senderId: userId,
              type: "text",
              text: text.trim(),
              mediaUrl: "",
              createdAt: ack.createdAt,
              pending: false,
            });
            updateChatInList(chatId, {
              lastMessageAt: ack.createdAt,
              lastMessagePreview: text.trim().slice(0, 80),
            });
          } else {
            removeOptimistic(chatId, tempId);
          }
        }
      );
    },
    [chatId, userId, addOptimistic, replaceOptimistic, removeOptimistic, updateChatInList]
  );

  const loadMore = useCallback(() => {
    if (!hasMore || messagesLoading || !nextCursor) return;
    loadHistory(nextCursor);
  }, [hasMore, messagesLoading, nextCursor, loadHistory]);

  const renderItem = ({ item }) => {
    const isOwn = String(item.senderId) === String(userId);
    return <ChatMessage message={item} isOwn={isOwn} pending={item.pending} />;
  };

  if (!chatId) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>No chat selected</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {messagesLoading && messages.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => String(item._id || item.id || item.pendingTempId)}
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
              <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
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
      />
    </KeyboardAvoidingView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
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
  });
}
