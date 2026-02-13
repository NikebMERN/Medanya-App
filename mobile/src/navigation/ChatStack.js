import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ChatsScreen from "../screens/chat/ChatsScreen";
import ChatRoomScreen from "../screens/chat/ChatRoomScreen";
import CreateGroupScreen from "../screens/chat/CreateGroupScreen";
import CreateChannelScreen from "../screens/chat/CreateChannelScreen";
import AddGroupMembersScreen from "../screens/chat/AddGroupMembersScreen";
import SearchJoinGroupScreen from "../screens/chat/SearchJoinGroupScreen";
import UserProfileScreen from "../screens/profile/UserProfileScreen";
import FollowersListScreen from "../screens/profile/FollowersListScreen";
import FollowingListScreen from "../screens/profile/FollowingListScreen";

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerShown: false,
  animation: "slide_from_right",
  gestureEnabled: true,
};

export default function ChatStack() {
  return (
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
  );
}
