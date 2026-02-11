/**
 * Chat state: list of chats, messages per room, optimistic updates, reconnect handling.
 */
import { create } from "zustand";

export const useChatStore = create((set, get) => ({
  chats: [],
  chatsLoading: false,
  chatsError: null,

  messagesByChatId: {},
  messagesLoading: {},
  nextCursorByChatId: {},
  hasMoreByChatId: {},

  setChats: (chats) => set({ chats: chats || [], chatsError: null }),
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

  clearMessages: (chatId) => {
    const id = String(chatId);
    set((s) => ({
      messagesByChatId: { ...s.messagesByChatId, [id]: [] },
      nextCursorByChatId: { ...s.nextCursorByChatId, [id]: null },
      hasMoreByChatId: { ...s.hasMoreByChatId, [id]: true },
    }));
  },

  getMessages: (chatId) => (get().messagesByChatId[String(chatId)] || []),
  getNextCursor: (chatId) => get().nextCursorByChatId[String(chatId)],
  getHasMore: (chatId) => get().hasMoreByChatId[String(chatId)] !== false,
}));
