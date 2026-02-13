import React, { Suspense, useEffect, useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ChatsScreen from "../screens/chat/ChatsScreen";
import { useThemeColors } from "../theme/useThemeColors";
import { useChatStore } from "../store/chat.store";
import { useAuthStore } from "../store/auth.store";
import { onChatMessageNew, offChatMessageNew, ensureChatSocket } from "../realtime/chat.socket";

const ChatRoomScreen = React.lazy(() => import("../screens/chat/ChatRoomScreen"));
const CreateGroupScreen = React.lazy(() => import("../screens/chat/CreateGroupScreen"));
const CreateChannelScreen = React.lazy(() => import("../screens/chat/CreateChannelScreen"));
const AddGroupMembersScreen = React.lazy(() => import("../screens/chat/AddGroupMembersScreen"));
const SearchJoinGroupScreen = React.lazy(() => import("../screens/chat/SearchJoinGroupScreen"));
const UserProfileScreen = React.lazy(() => import("../screens/profile/UserProfileScreen"));
const FollowersListScreen = React.lazy(() => import("../screens/profile/FollowersListScreen"));
const FollowingListScreen = React.lazy(() => import("../screens/profile/FollowingListScreen"));

const Stack = createNativeStackNavigator();

function LazyFallback() {
  const colors = useThemeColors();
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors?.background || "#fff" }}>
      <ActivityIndicator size="small" color={colors?.primary} />
    </View>
  );
}

const screenOptions = {
  headerShown: false,
  animation: "none",
  gestureEnabled: true,
};

export default function ChatStack() {
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id ?? s.user?.userId) ?? "";
  const appendMessage = useChatStore((s) => s.appendMessage);
  const updateChatInList = useChatStore((s) => s.updateChatInList);
  const incrementUnread = useChatStore((s) => s.incrementUnread);
  const handlerRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    ensureChatSocket(token);
  }, [token]);

  useEffect(() => {
    const handler = (message) => {
      const msgChatId = String(message.chatId || message.chat);
      appendMessage(msgChatId, message);
      const preview =
        message.type === "text"
          ? (message.text || "").slice(0, 80)
          : message.type === "image"
            ? "📷 Image"
            : message.type === "video"
              ? "🎥 Video"
              : "🎙️ Voice";
      updateChatInList(msgChatId, {
        lastMessageAt: message.createdAt,
        lastMessagePreview: preview,
      });
      const current = useChatStore.getState().currentChatId;
      if (current !== msgChatId && String(message.senderId) !== String(userId)) {
        incrementUnread(msgChatId);
      }
    };
    handlerRef.current = handler;
    onChatMessageNew(handler);
    return () => offChatMessageNew(handler);
  }, [userId, appendMessage, updateChatInList, incrementUnread]);

  return (
    <Suspense fallback={<LazyFallback />}>
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name="Chats" component={ChatsScreen} options={{ animation: "none" }} />
        <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
        <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
        <Stack.Screen name="CreateChannel" component={CreateChannelScreen} />
        <Stack.Screen name="AddGroupMembers" component={AddGroupMembersScreen} />
        <Stack.Screen name="SearchJoinGroup" component={SearchJoinGroupScreen} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="FollowersList" component={FollowersListScreen} />
        <Stack.Screen name="FollowingList" component={FollowingListScreen} />
      </Stack.Navigator>
    </Suspense>
  );
}
