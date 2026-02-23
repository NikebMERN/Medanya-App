import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../store/auth.store";
import { HeaderBackProvider } from "../context/HeaderBackContext";
import AuthNavigator from "./AuthNavigator";
import MainTabs from "./MainTabs";
import ProfileCreationScreen from "../screens/auth/ProfileCreationScreen";
import CreateScreen from "../screens/create/CreateScreen";
import VideoUploadScreen from "../screens/videos/VideoUploadScreen";
import VideosStack from "./VideosStack";
import LivestreamStack from "./LivestreamStack";
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
            <Stack.Screen name="VideoReels" component={VideosStack} options={{ animation: "fade" }} />
            <Stack.Screen name="Live" component={LivestreamStack} options={{ animation: "fade" }} />
          </Stack.Navigator>
        </HeaderBackProvider>
      )}
    </NavigationContainer>
  );
}
