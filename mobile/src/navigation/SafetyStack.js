import React, { Suspense } from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useThemeColors } from "../theme/useThemeColors";
import StackBackHeader from "../components/StackBackHeader";
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

const rootScreenOptions = { headerShown: false, animation: "slide_from_right", gestureEnabled: true };
const subScreenOptions = {
  headerShown: true,
  header: ({ route, options }) => <StackBackHeader route={route} options={options} />,
  animation: "slide_from_right",
  gestureEnabled: true,
};

export default function SafetyStack() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <Stack.Navigator screenOptions={rootScreenOptions}>
        <Stack.Screen name="SafetyHub" component={SafetyHubScreen} options={{ animation: "none" }} />
        <Stack.Screen name="ReportForm" component={ReportFormScreen} options={{ ...subScreenOptions, title: "Report" }} />
        <Stack.Screen name="BlacklistSearch" component={BlacklistSearchScreen} options={{ ...subScreenOptions, title: "Blacklist" }} />
        <Stack.Screen name="BlacklistDetail" component={BlacklistDetailScreen} options={{ ...subScreenOptions, title: "Detail" }} />
        <Stack.Screen name="MissingList" component={MissingListScreen} options={{ ...subScreenOptions, title: "Missing alerts" }} />
        <Stack.Screen name="MissingDetail" component={MissingDetailScreen} options={{ ...subScreenOptions, title: "Alert" }} />
        <Stack.Screen name="MissingCreate" component={MissingCreateScreen} options={{ ...subScreenOptions, title: "Report missing" }} />
      </Stack.Navigator>
    </Suspense>
  );
}
