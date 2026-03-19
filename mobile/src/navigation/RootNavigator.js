import React from "react";
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../store/auth.store";
import Toast from "../components/ui/Toast";
import { HeaderBackProvider } from "../context/HeaderBackContext";
import AuthNavigator from "./AuthNavigator";
import MainTabs from "./MainTabs";
import ProfileCreationScreen from "../screens/auth/ProfileCreationScreen";
import CreateScreen from "../screens/create/CreateScreen";
import VideoUploadScreen from "../screens/videos/VideoUploadScreen";
import RecordingScreen from "../modules/recording/screens/RecordingScreen";
import VideoEditScreen from "../screens/videos/VideoEditScreen";
import VideoPublishScreen from "../screens/videos/VideoPublishScreen";
import VideosStack from "./VideosStack";
import LivestreamStack from "./LivestreamStack";
import PenaltyCenterScreen from "../screens/penalties/PenaltyCenterScreen";
import linking from "./linking";

const Stack = createNativeStackNavigator();

function isProfileComplete(user) {
  if (!user) return false;
  if (user.isGuest) return true;
  const name = user.display_name ?? user.displayName;
  const email = user.email;
  return !!(name && name.trim().length >= 2 && email && email.trim().length > 0);
}

export default function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const profileComplete = isProfileComplete(user);

  return (
    <View style={{ flex: 1 }}>
    <NavigationContainer linking={linking}>
      {!isAuthenticated ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthNavigator} />
        </Stack.Navigator>
      ) : !profileComplete ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="ProfileCreation" component={ProfileCreationScreen} />
        </Stack.Navigator>
      ) : (
        <HeaderBackProvider>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Create" component={CreateScreen} options={{ presentation: "modal" }} />
            <Stack.Screen
              name="VideoCreate"
              component={VideoUploadScreen}
              options={{ presentation: "fullScreenModal", headerShown: false, gestureEnabled: true }}
            />
            <Stack.Screen
              name="VideoRecord"
              component={RecordingScreen}
              options={{ presentation: "fullScreenModal", headerShown: false, gestureEnabled: true }}
            />
            <Stack.Screen
              name="VideoEdit"
              component={VideoEditScreen}
              options={{ headerShown: false, gestureEnabled: true }}
            />
            <Stack.Screen
              name="VideoPublish"
              component={VideoPublishScreen}
              options={{ headerShown: false, gestureEnabled: true }}
            />
            <Stack.Screen name="VideoReels" component={VideosStack} options={{ animation: "fade" }} />
            <Stack.Screen name="Live" component={LivestreamStack} options={{ animation: "fade" }} />
            <Stack.Screen name="PenaltyCenter" component={PenaltyCenterScreen} options={{ headerShown: false }} />
          </Stack.Navigator>
        </HeaderBackProvider>
      )}
    </NavigationContainer>
    <Toast />
    </View>
  );
}
