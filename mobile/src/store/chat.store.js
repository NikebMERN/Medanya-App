/**
 * Chat state: list of chats, messages per room, optimistic updates, reconnect handling.
 */
import { create } from "zustand";

export const HIDDEN_CHATS_KEY = "@medanya_hidden_chat_ids";
export const PINNED_CHATS_KEY = "@medanya_pinned_chat_ids";
export const MUTED_CHATS_KEY = "@medanya_muted_chat_ids";

export const useChatStore = create((set, get) => ({
  chats: [],
  chatsLoading: false,
  chatsError: null,
  /** Chat IDs the user has "deleted" (hidden from list). Persist to AsyncStorage. */
  hiddenChatIds: [],
  /** Ordered list of pinned chat IDs (pinned chats appear at top). Persist to AsyncStorage. */
  pinnedChatIds: [],
  /** Set of muted chat IDs (for future notification handling). Persist to AsyncStorage. */
  mutedChatIds: [],
  /** User IDs the current user has blocked; used to show "medanya_user" and no avatar for them. */
  blockedUserIds: [],
  /** Map of userId (string) -> { displayName, avatarUrl } for chat list display; never cleared so names/pics persist when list reorders */
  participantProfiles: {},

  /** Chat ID of the room currently open (null when on list). Used to avoid incrementing unread for the open room. */
  currentChatId: null,
  /**
   * Map of chatId (string) -> unread count (number). Incremented when a message arrives and we're not in that room.
   * Ready for future: can be hydrated from server on login, and drive push notification badges.
   */
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
  /** For notifications UI: total unread across all chats. Muted chats can be excluded later. */
  getTotalUnread: () =>
    Object.values(get().unreadByChatId || {}).reduce((sum, n) => sum + Math.max(0, Number(n) || 0), 0),
  getUnreadCount: (chatId) => Math.max(0, Number(get().unreadByChatId[String(chatId)]) || 0),
  hasUnread: (chatId) => (get().unreadByChatId[String(chatId)] ?? 0) > 0,

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
  setPinnedChatIds: (ids) => set({ pinnedChatIds: ids || [] }),
  setMutedChatIds: (ids) => set({ mutedChatIds: ids || [] }),
  togglePin: (chatId) => {
    const id = String(chatId);
    const current = get().pinnedChatIds || [];
    const isPinned = current.includes(id);
    const next = isPinned ? current.filter((c) => c !== id) : [id, ...current];
    set({ pinnedChatIds: next });
    return next;
  },
  toggleMute: (chatId) => {
    const id = String(chatId);
    const current = get().mutedChatIds || [];
    const isMuted = current.includes(id);
    const next = isMuted ? current.filter((c) => c !== id) : [...current, id];
    set({ mutedChatIds: next });
    return next;
  },
  isPinned: (chatId) => (get().pinnedChatIds || []).includes(String(chatId)),
  isMuted: (chatId) => (get().mutedChatIds || []).includes(String(chatId)),
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
