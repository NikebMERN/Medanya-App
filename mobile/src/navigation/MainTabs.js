import React, { useMemo } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";
import AppTabBar from "../components/AppTabBar";
import HomeScreen from "../screens/home/HomeScreen";
import ChatStack from "./ChatStack";
import JobsStack from "./JobsStack";
import MarketplaceStack from "./MarketplaceStack";
import SafetyStack from "./SafetyStack";
import ProfileStack from "./ProfileStack";

const Tab = createBottomTabNavigator();

const CHAT_SUB_SCREENS = new Set(["ChatRoom", "CreateGroup", "CreateChannel", "AddGroupMembers", "EditGroup", "EditChannel", "SearchJoinGroup", "UserProfile", "FollowersList", "FollowingList"]);
const JOBS_SUB_SCREENS = new Set(["JobDetail", "CreateJob"]);
const MARKETPLACE_SUB_SCREENS = new Set(["MarketplaceDetail", "CreateItem"]);
const SAFETY_SUB_SCREENS = new Set(["ReportForm", "BlacklistSearch", "BlacklistDetail", "MissingList", "MissingDetail", "MissingCreate"]);
const PROFILE_SUB_SCREENS = new Set(["EditProfile", "FollowRequests", "BlockedUsers", "FollowersList", "FollowingList", "UserProfile", "Kyc"]);

const renderHeader = ({ navigation, route }) => {
  const rawFocused = getFocusedRouteNameFromRoute(route);
  const focusedRouteName = rawFocused ?? (route.name === "Chat" ? "Chats" : route.name === "Profile" ? "ProfileMain" : route.name);
  const isChatSub = route.name === "Chat" && CHAT_SUB_SCREENS.has(rawFocused);
  const isJobsSub = route.name === "Jobs" && JOBS_SUB_SCREENS.has(rawFocused);
  const isMarketplaceSub = route.name === "Marketplace" && MARKETPLACE_SUB_SCREENS.has(rawFocused);
  const isSafetySub = route.name === "Safety" && SAFETY_SUB_SCREENS.has(rawFocused);
  const isProfileSub = route.name === "Profile" && PROFILE_SUB_SCREENS.has(rawFocused);
  if (isChatSub || isJobsSub || isMarketplaceSub || isSafetySub || isProfileSub) return null;
  return <AppHeader navigation={navigation} route={route} focusedRouteName={focusedRouteName} />;
};

export default function MainTabs() {
  const screenOptions = useMemo(
    () => ({
      lazy: true,
      headerShown: true,
      header: renderHeader,
    }),
    []
  );
  return (
    <Tab.Navigator
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={screenOptions}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "MEDANYA" }} />
      <Tab.Screen name="Jobs" component={JobsStack} options={{ title: "Jobs" }} />
      <Tab.Screen name="Marketplace" component={MarketplaceStack} options={{ title: "Marketplace" }} />
      <Tab.Screen name="Safety" component={SafetyStack} options={{ title: "Safety" }} />
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
