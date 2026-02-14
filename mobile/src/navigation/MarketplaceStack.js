import React, { Suspense } from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useThemeColors } from "../theme/useThemeColors";
import MarketplaceListScreen from "../screens/marketplace/MarketplaceListScreen";

const MarketplaceDetailScreen = React.lazy(() => import("../screens/marketplace/MarketplaceDetailScreen"));
const CreateItemScreen = React.lazy(() => import("../screens/marketplace/CreateItemScreen"));

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

export default function MarketplaceStack() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name="MarketplaceList" component={MarketplaceListScreen} options={{ animation: "none" }} />
        <Stack.Screen name="MarketplaceDetail" component={MarketplaceDetailScreen} />
        <Stack.Screen name="CreateItem" component={CreateItemScreen} />
      </Stack.Navigator>
    </Suspense>
  );
}
