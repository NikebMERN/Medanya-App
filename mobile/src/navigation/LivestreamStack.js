import React, { Suspense } from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useThemeColors } from "../theme/useThemeColors";
import StackBackHeader from "../components/StackBackHeader";
import LiveListScreen from "../screens/livestream/LiveListScreen";

const LiveHostSetupScreen = React.lazy(() => import("../screens/livestream/LiveHostSetupScreen"));
const LivePlayerScreen = React.lazy(() => import("../screens/livestream/LivePlayerScreen"));

const Stack = createNativeStackNavigator();

function LazyFallback() {
  const colors = useThemeColors();
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );
}

const rootScreenOptions = { headerShown: false, animation: "slide_from_right", gestureEnabled: true };
const subScreenOptions = {
  headerShown: true,
  header: ({ route, options }) => <StackBackHeader route={route} options={options} />,
  animation: "slide_from_right",
  gestureEnabled: true,
};

export default function LivestreamStack() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <Stack.Navigator screenOptions={rootScreenOptions}>
        <Stack.Screen name="LiveList" component={LiveListScreen} options={{ animation: "none" }} />
        <Stack.Screen name="LiveHostSetup" component={LiveHostSetupScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LivePlayer" component={LivePlayerScreen} options={{ headerShown: false, animation: "none" }} />
      </Stack.Navigator>
    </Suspense>
  );
}
