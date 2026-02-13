import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "../screens/profile/ProfileScreen";
import EditProfileScreen from "../screens/profile/EditProfileScreen";
import FollowRequestsScreen from "../screens/profile/FollowRequestsScreen";
import BlockedUsersScreen from "../screens/profile/BlockedUsersScreen";
import FollowersListScreen from "../screens/profile/FollowersListScreen";
import FollowingListScreen from "../screens/profile/FollowingListScreen";
import UserProfileScreen from "../screens/profile/UserProfileScreen";

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerShown: false,
  animation: "slide_from_right",
  gestureEnabled: true,
};

export default function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ animation: "none" }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="FollowRequests" component={FollowRequestsScreen} />
      <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
      <Stack.Screen name="FollowersList" component={FollowersListScreen} />
      <Stack.Screen name="FollowingList" component={FollowingListScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    </Stack.Navigator>
  );
}
