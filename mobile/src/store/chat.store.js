/**
 * Chat state: list of chats, messages per room, optimistic updates, reconnect handling.
 */
import { create } from "zustand";

export const HIDDEN_CHATS_KEY = "@medanya_hidden_chat_ids";

export const useChatStore = create((set, get) => ({
  chats: [],
  chatsLoading: false,
  chatsError: null,
  /** Chat IDs the user has "deleted" (hidden from list). Persist to AsyncStorage. */
  hiddenChatIds: [],
  /** User IDs the current user has blocked; used to show "medanya_user" and no avatar for them. */
  blockedUserIds: [],
  /** Map of userId (string) -> { displayName, avatarUrl } for chat list display; never cleared so names/pics persist when list reorders */
  participantProfiles: {},

  /** Chat ID of the room currently open (null when on list). Used to avoid incrementing unread for the open room. */
  currentChatId: null,
  /** Map of chatId (string) -> unread count (number). Incremented when a message arrives and we're not in that room. */
  unreadByChatId: {},

  setCurrentChatId: (chatId) => set({ currentChatId: chatId ? String(chatId) : null }),
  markChatAsRead: (chatId) => {
    const id = String(chatId);
    set((s) => ({
      unreadByChatId: { ...s.unreadByChatId, [id]: 0 },
    }));
  },
  incrementUnread: (chatId) => {
    const id = String(chatId);
    set((s) => {
      const prev = s.unreadByChatId[id] ?? 0;
      return { unreadByChatId: { ...s.unreadByChatId, [id]: prev + 1 } };
    });
  },

  messagesByChatId: {},
  messagesLoading: {},
  nextCursorByChatId: {},
  hasMoreByChatId: {},

  setChats: (chats) => {
    const list = chats || [];
    const hidden = new Set((get().hiddenChatIds || []).map(String));
    const filtered = list.filter((c) => !hidden.has(String(c._id || c.id)));
    set({ chats: filtered, chatsError: null });
  },
  setHiddenChatIds: (ids) => {
    const next = ids || [];
    const hidden = new Set(next.map(String));
    set((s) => ({
      hiddenChatIds: next,
      chats: (s.chats || []).filter((c) => !hidden.has(String(c._id || c.id))),
    }));
  },
  addHiddenChatId: (chatId) => {
    const id = String(chatId);
    const next = [...new Set([...(get().hiddenChatIds || []).map(String), id])];
    set({
      hiddenChatIds: next,
      chats: (get().chats || []).filter((c) => String(c._id || c.id) !== id),
    });
    return next;
  },
  setBlockedUserIds: (ids) => set({ blockedUserIds: ids || [] }),
  addBlockedUserId: (userId) => {
    const id = String(userId);
    const next = [...new Set([...(get().blockedUserIds || []).map(String), id])];
    set({ blockedUserIds: next });
    return next;
  },
  setChatsLoading: (loading) => set({ chatsLoading: loading }),
  setChatsError: (err) => set({ chatsError: err, chatsLoading: false }),

  setMessages: (chatId, messages, nextCursor, hasMore = true) => {
    const id = String(chatId);
    set((s) => ({
      messagesByChatId: { ...s.messagesByChatId, [id]: messages || [] },
      nextCursorByChatId: { ...s.nextCursorByChatId, [id]: nextCursor ?? null },
      hasMoreByChatId: { ...s.hasMoreByChatId, [id]: hasMore },
      messagesLoading: { ...s.messagesLoading, [id]: false },
    }));
  },

  prependMessages: (chatId, olderMessages, nextCursor, hasMore) => {
    const id = String(chatId);
    set((s) => ({
      messagesByChatId: {
        ...s.messagesByChatId,
        [id]: [...(olderMessages || []), ...(s.messagesByChatId[id] || [])],
      },
      nextCursorByChatId: { ...s.nextCursorByChatId, [id]: nextCursor ?? null },
      hasMoreByChatId: { ...s.hasMoreByChatId, [id]: hasMore },
      messagesLoading: { ...s.messagesLoading, [id]: false },
    }));
  },

  setMessagesLoading: (chatId, loading) => {
    const id = String(chatId);
    set((s) => ({ messagesLoading: { ...s.messagesLoading, [id]: loading } }));
  },

  appendMessage: (chatId, message) => {
    const id = String(chatId);
    const msgId = message._id || message.id;
    set((s) => {
      const list = s.messagesByChatId[id] || [];
      if (list.some((m) => (m._id || m.id) === msgId)) return s;
      return {
        messagesByChatId: { ...s.messagesByChatId, [id]: [...list, message] },
      };
    });
  },

  replaceOptimistic: (chatId, tempId, serverMessage) => {
    const id = String(chatId);
    set((s) => {
      const list = s.messagesByChatId[id] || [];
      const next = list.map((m) =>
        (m._id || m.id) === tempId || m.pendingTempId === tempId ? serverMessage : m
      );
      return { messagesByChatId: { ...s.messagesByChatId, [id]: next } };
    });
  },

  removeOptimistic: (chatId, tempId) => {
    const id = String(chatId);
    set((s) => {
      const list = (s.messagesByChatId[id] || []).filter(
        (m) => m.pendingTempId !== tempId && (m._id || m.id) !== tempId
      );
      return { messagesByChatId: { ...s.messagesByChatId, [id]: list } };
    });
  },

  addOptimistic: (chatId, optimisticMessage) => {
    const id = String(chatId);
    set((s) => ({
      messagesByChatId: {
        ...s.messagesByChatId,
        [id]: [...(s.messagesByChatId[id] || []), optimisticMessage],
      },
    }));
  },

  updateChatInList: (chatId, updates) => {
    const id = String(chatId);
    set((s) => ({
      chats: s.chats.map((c) =>
        String(c._id || c.id) === id ? { ...c, ...updates } : c
      ),
    }));
  },

  removeChatFromList: (chatId) => {
    const id = String(chatId);
    set((s) => ({
      chats: s.chats.filter((c) => String(c._id || c.id) !== id),
    }));
  },

  setParticipantProfile: (userId, profile) => {
    const id = String(userId);
    if (!id) return;
    set((s) => ({
      participantProfiles: {
        ...s.participantProfiles,
        [id]: {
          displayName: profile?.displayName ?? profile?.display_name ?? `User ${id}`,
          avatarUrl: profile?.avatarUrl ?? profile?.avatar_url ?? null,
        },
      },
    }));
  },

  clearMessages: (chatId) => {
    const id = String(chatId);
    set((s) => ({
      messagesByChatId: { ...s.messagesByChatId, [id]: [] },
      nextCursorByChatId: { ...s.nextCursorByChatId, [id]: null },
      hasMoreByChatId: { ...s.hasMoreByChatId, [id]: true },
    }));
  },

  removeMessage: (chatId, messageId) => {
    const id = String(chatId);
    const mid = String(messageId);
    set((s) => {
      const list = (s.messagesByChatId[id] || []).filter(
        (m) => String(m._id || m.id) !== mid && String(m.pendingTempId) !== mid
      );
      return { messagesByChatId: { ...s.messagesByChatId, [id]: list } };
    });
  },

  updateMessage: (chatId, messageId, updates) => {
    const id = String(chatId);
    const mid = String(messageId);
    set((s) => {
      const list = (s.messagesByChatId[id] || []).map((m) =>
        String(m._id || m.id) === mid ? { ...m, ...updates } : m
      );
      return { messagesByChatId: { ...s.messagesByChatId, [id]: list } };
    });
  },

  getMessages: (chatId) => (get().messagesByChatId[String(chatId)] || []),
  getNextCursor: (chatId) => get().nextCursorByChatId[String(chatId)],
  getHasMore: (chatId) => get().hasMoreByChatId[String(chatId)] !== false,
}));
