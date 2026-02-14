import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";
import AppTabBar from "../components/AppTabBar";
import FeedScreen from "../screens/home/FeedScreen";
import ChatStack from "./ChatStack";
import JobsStack from "./JobsStack";
import VideoFeedScreen from "../screens/videos/VideoFeedScreen";
import LiveListScreen from "../screens/livestream/LiveListScreen";
import ProfileStack from "./ProfileStack";

const Tab = createBottomTabNavigator();

const CHAT_SUB_SCREENS = new Set(["ChatRoom", "CreateGroup", "CreateChannel", "AddGroupMembers", "EditGroup", "EditChannel", "SearchJoinGroup", "UserProfile", "FollowersList", "FollowingList"]);
const JOBS_SUB_SCREENS = new Set(["JobDetail"]);
const PROFILE_SUB_SCREENS = new Set(["EditProfile", "FollowRequests", "BlockedUsers", "FollowersList", "FollowingList", "UserProfile"]);

export default function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        lazy: true,
        headerShown: true,
        header: ({ navigation, route }) => {
          const rawFocused = getFocusedRouteNameFromRoute(route);
          const focusedRouteName = rawFocused ?? (route.name === "Chat" ? "Chats" : route.name === "Profile" ? "ProfileMain" : route.name);
          const isChatSub = route.name === "Chat" && CHAT_SUB_SCREENS.has(rawFocused);
          const isJobsSub = route.name === "Jobs" && JOBS_SUB_SCREENS.has(rawFocused);
          const isProfileSub = route.name === "Profile" && PROFILE_SUB_SCREENS.has(rawFocused);
          if (isChatSub || isJobsSub || isProfileSub) return null;
          return <AppHeader navigation={navigation} route={route} focusedRouteName={focusedRouteName} />;
        },
      }}
    >
      <Tab.Screen name="Home" component={FeedScreen} options={{ title: "MEDANYA" }} />
      <Tab.Screen name="Jobs" component={JobsStack} options={{ title: "Jobs" }} />
      <Tab.Screen name="Videos" component={VideoFeedScreen} options={{ title: "Videos" }} />
      <Tab.Screen name="Live" component={LiveListScreen} options={{ title: "Safety" }} />
      <Tab.Screen
        name="Chat"
        component={ChatStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route);
          const hideHeader = routeName != null && CHAT_SUB_SCREENS.has(routeName);
          return { title: "Chat", headerShown: !hideHeader };
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route);
          const hideHeader = routeName != null && PROFILE_SUB_SCREENS.has(routeName);
          return { title: "Profile", headerShown: !hideHeader };
        }}
      />
    </Tab.Navigator>
  );
}
