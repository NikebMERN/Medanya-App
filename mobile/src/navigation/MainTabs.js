import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AppHeader from "../components/AppHeader";
import AppTabBar from "../components/AppTabBar";
import FeedScreen from "../screens/home/FeedScreen";
import ChatStack from "./ChatStack";
import JobsListScreen from "../screens/jobs/JobsListScreen";
import VideoFeedScreen from "../screens/videos/VideoFeedScreen";
import LiveListScreen from "../screens/livestream/LiveListScreen";
import ProfileStack from "./ProfileStack";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        header: ({ navigation }) => <AppHeader navigation={navigation} />,
      }}
    >
      <Tab.Screen name="Home" component={FeedScreen} options={{ title: "MEDANYA" }} />
      <Tab.Screen name="Jobs" component={JobsListScreen} options={{ title: "Jobs" }} />
      <Tab.Screen name="Videos" component={VideoFeedScreen} options={{ title: "Videos" }} />
      <Tab.Screen name="Live" component={LiveListScreen} options={{ title: "Safety" }} />
      <Tab.Screen name="Chat" component={ChatStack} options={{ title: "Chat" }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}
