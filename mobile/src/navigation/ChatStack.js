import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ChatsScreen from "../screens/chat/ChatsScreen";
import ChatRoomScreen from "../screens/chat/ChatRoomScreen";
import CreateGroupScreen from "../screens/chat/CreateGroupScreen";
import CreateChannelScreen from "../screens/chat/CreateChannelScreen";
import UserProfileScreen from "../screens/profile/UserProfileScreen";

const Stack = createNativeStackNavigator();

export default function ChatStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Chats" component={ChatsScreen} />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
      <Stack.Screen name="CreateChannel" component={CreateChannelScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    </Stack.Navigator>
  );
}
