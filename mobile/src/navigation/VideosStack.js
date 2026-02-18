import React, { Suspense } from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useThemeColors } from "../theme/useThemeColors";
import VideoFeedScreen from "../screens/videos/VideoFeedScreen";
import ReelsFeedScreen from "../screens/videos/ReelsFeedScreen";

const VideoDetailScreen = React.lazy(() => import("../screens/videos/VideoDetailScreen"));
const VideoUploadScreen = React.lazy(() => import("../screens/videos/VideoUploadScreen"));

const Stack = createNativeStackNavigator();

function LazyFallback() {
  const colors = useThemeColors();
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );
}

export default function VideosStack() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        <Stack.Screen name="VideoFeed" component={VideoFeedScreen} options={{ animation: "none" }} />
        <Stack.Screen name="ReelsFeed" component={ReelsFeedScreen} options={{ animation: "none" }} />
        <Stack.Screen name="VideoDetail" component={VideoDetailScreen} />
        <Stack.Screen name="VideoUpload" component={VideoUploadScreen} />
      </Stack.Navigator>
    </Suspense>
  );
}

