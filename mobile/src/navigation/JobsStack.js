import React, { Suspense } from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useThemeColors } from "../theme/useThemeColors";
import JobsListScreen from "../screens/jobs/JobsListScreen";

const JobDetailScreen = React.lazy(() => import("../screens/jobs/JobDetailScreen"));

const Stack = createNativeStackNavigator();

function LazyFallback() {
  const colors = useThemeColors();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors?.background || "#fff",
      }}
    >
      <ActivityIndicator size="small" color={colors?.primary} />
    </View>
  );
}

const screenOptions = {
  headerShown: false,
  animation: "slide_from_right",
  gestureEnabled: true,
};

export default function JobsStack() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name="JobsList" component={JobsListScreen} options={{ animation: "none" }} />
        <Stack.Screen name="JobDetail" component={JobDetailScreen} />
      </Stack.Navigator>
    </Suspense>
  );
}
