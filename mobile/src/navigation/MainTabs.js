import React, { useMemo } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";
import AppTabBar from "../components/AppTabBar";
import GuestRestrictedStack from "../components/GuestRestrictedStack";
import HomeScreen from "../screens/home/HomeScreen";
import ChatStack from "./ChatStack";
import JobsStack from "./JobsStack";
import MarketplaceStack from "./MarketplaceStack";
import SafetyStack from "./SafetyStack";
import ProfileStack from "./ProfileStack";

const Tab = createBottomTabNavigator();

function JobsTab() {
  return (
    <GuestRestrictedStack message="Sign in to browse and post jobs">
      <JobsStack />
    </GuestRestrictedStack>
  );
}
function MarketplaceTab() {
  return (
    <GuestRestrictedStack message="Sign in to browse and sell items">
      <MarketplaceStack />
    </GuestRestrictedStack>
  );
}
function SafetyTab() {
  return (
    <GuestRestrictedStack message="Sign in to access safety tools">
      <SafetyStack />
    </GuestRestrictedStack>
  );
}
function ChatTab() {
  return (
    <GuestRestrictedStack message="Sign in to chat">
      <ChatStack />
    </GuestRestrictedStack>
  );
}
function ProfileTab() {
  return (
    <GuestRestrictedStack message="Sign in to view your profile">
      <ProfileStack />
    </GuestRestrictedStack>
  );
}

const CHAT_SUB_SCREENS = new Set(["ChatRoom", "CreateGroup", "CreateChannel", "AddGroupMembers", "EditGroup", "EditChannel", "SearchJoinGroup", "UserProfile", "FollowersList", "FollowingList"]);
const JOBS_SUB_SCREENS = new Set(["JobDetail", "CreateJob"]);
const MARKETPLACE_SUB_SCREENS = new Set(["MarketplaceDetail", "CreateItem", "Checkout", "OrderStatus", "OrdersList", "DeliveryConfirm"]);
const SAFETY_SUB_SCREENS = new Set(["ReportForm", "BlacklistSearch", "BlacklistDetail", "MissingList", "MissingDetail", "MissingCreate"]);
const PROFILE_SUB_SCREENS = new Set(["EditProfile", "FollowRequests", "BlockedUsers", "FollowersList", "FollowingList", "UserProfile", "Kyc", "KycDocUpload", "KycSelfie", "KycMismatch", "VerifyIdentity", "Insights", "FavoriteItems", "Wallet", "WalletHistory", "EarnCoins", "Referral", "Withdraw", "Recharge", "Notifications", "PayoutSetup"]);

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
      <Tab.Screen
        name="Jobs"
        component={JobsTab}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route);
          const hideHeader = routeName != null && JOBS_SUB_SCREENS.has(routeName);
          return { title: "Jobs", headerShown: !hideHeader };
        }}
      />
      <Tab.Screen
        name="Marketplace"
        component={MarketplaceTab}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route);
          const hideHeader = routeName != null && MARKETPLACE_SUB_SCREENS.has(routeName);
          return { title: "Marketplace", headerShown: !hideHeader };
        }}
      />
      <Tab.Screen
        name="Safety"
        component={SafetyTab}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route);
          const hideHeader = routeName != null && SAFETY_SUB_SCREENS.has(routeName);
          return { title: "Safety", headerShown: !hideHeader };
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatTab}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route);
          const hideHeader = routeName != null && CHAT_SUB_SCREENS.has(routeName);
          return { title: "Chat", headerShown: !hideHeader };
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileTab}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route);
          const hideHeader = routeName != null && PROFILE_SUB_SCREENS.has(routeName);
          return { title: "Profile", headerShown: !hideHeader };
        }}
      />
    </Tab.Navigator>
  );
}
