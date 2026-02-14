import React, { Suspense } from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useThemeColors } from "../theme/useThemeColors";
import SafetyHubScreen from "../screens/reports/SafetyHubScreen";

const ReportFormScreen = React.lazy(() => import("../screens/reports/ReportFormScreen"));
const BlacklistSearchScreen = React.lazy(() => import("../screens/reports/BlacklistSearchScreen"));
const BlacklistDetailScreen = React.lazy(() => import("../screens/reports/BlacklistDetailScreen"));
const MissingListScreen = React.lazy(() => import("../screens/missing/MissingListScreen"));
const MissingDetailScreen = React.lazy(() => import("../screens/missing/MissingDetailScreen"));
const MissingCreateScreen = React.lazy(() => import("../screens/missing/MissingCreateScreen"));

const Stack = createNativeStackNavigator();

function LazyFallback() {
  const colors = useThemeColors();
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors?.background || "#fff" }}>
      <ActivityIndicator size="small" color={colors?.primary} />
    </View>
  );
}

const screenOptions = { headerShown: false, animation: "slide_from_right", gestureEnabled: true };

export default function SafetyStack() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name="SafetyHub" component={SafetyHubScreen} options={{ animation: "none" }} />
        <Stack.Screen name="ReportForm" component={ReportFormScreen} />
        <Stack.Screen name="BlacklistSearch" component={BlacklistSearchScreen} />
        <Stack.Screen name="BlacklistDetail" component={BlacklistDetailScreen} />
        <Stack.Screen name="MissingList" component={MissingListScreen} />
        <Stack.Screen name="MissingDetail" component={MissingDetailScreen} />
        <Stack.Screen name="MissingCreate" component={MissingCreateScreen} />
      </Stack.Navigator>
    </Suspense>
  );
}
