import React, { Suspense } from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useThemeColors } from "../theme/useThemeColors";
import StackBackHeader from "../components/StackBackHeader";
import MarketplaceListScreen from "../screens/marketplace/MarketplaceListScreen";

const MarketplaceDetailScreen = React.lazy(() => import("../screens/marketplace/MarketplaceDetailScreen"));
const CreateItemScreen = React.lazy(() => import("../screens/marketplace/CreateItemScreen"));
const CheckoutScreen = React.lazy(() => import("../screens/marketplace/CheckoutScreen"));
const OrderStatusScreen = React.lazy(() => import("../screens/marketplace/OrderStatusScreen"));
const OrdersScreen = React.lazy(() => import("../screens/marketplace/OrdersScreen"));
const DeliveryConfirmScreen = React.lazy(() => import("../screens/marketplace/DeliveryConfirmScreen"));

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

export default function MarketplaceStack() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <Stack.Navigator screenOptions={rootScreenOptions}>
        <Stack.Screen name="MarketplaceList" component={MarketplaceListScreen} options={{ animation: "none" }} />
        <Stack.Screen name="MarketplaceDetail" component={MarketplaceDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CreateItem" component={CreateItemScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen
          name="OrderStatus"
          component={OrderStatusScreen}
          options={{ animation: "fade", animationDuration: 200 }}
        />
        <Stack.Screen name="OrdersList" component={OrdersScreen} />
        <Stack.Screen name="DeliveryConfirm" component={DeliveryConfirmScreen} />
      </Stack.Navigator>
    </Suspense>
  );
}
