import React, { Suspense } from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "../screens/profile/ProfileScreen";
import { useThemeColors } from "../theme/useThemeColors";

const EditProfileScreen = React.lazy(() => import("../screens/profile/EditProfileScreen"));
const FollowRequestsScreen = React.lazy(() => import("../screens/profile/FollowRequestsScreen"));
const BlockedUsersScreen = React.lazy(() => import("../screens/profile/BlockedUsersScreen"));
const FollowersListScreen = React.lazy(() => import("../screens/profile/FollowersListScreen"));
const FollowingListScreen = React.lazy(() => import("../screens/profile/FollowingListScreen"));
const UserProfileScreen = React.lazy(() => import("../screens/profile/UserProfileScreen"));
const KycScreen = React.lazy(() => import("../screens/profile/KycScreen"));
const KycDocUploadScreen = React.lazy(() => import("../screens/profile/KycDocUploadScreen"));
const KycSelfieScreen = React.lazy(() => import("../screens/profile/KycSelfieScreen"));
const KycMismatchScreen = React.lazy(() => import("../screens/profile/KycMismatchScreen"));
const VerifyIdentityScreen = React.lazy(() => import("../screens/profile/VerifyIdentityScreen"));
const FavoriteItemsScreen = React.lazy(() => import("../screens/marketplace/FavoriteItemsScreen"));
const WalletScreen = React.lazy(() => import("../screens/wallet/WalletScreen"));
const RechargeScreen = React.lazy(() => import("../screens/wallet/RechargeScreen"));

const Stack = createNativeStackNavigator();

function LazyFallback() {
  const colors = useThemeColors();
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors?.background || "#fff" }}>
      <ActivityIndicator size="small" color={colors?.primary} />
    </View>
  );
}

const screenOptions = {
  headerShown: false,
  animation: "none",
  gestureEnabled: true,
};

export default function ProfileStack() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ animation: "none" }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="FollowRequests" component={FollowRequestsScreen} />
        <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
        <Stack.Screen name="FollowersList" component={FollowersListScreen} />
        <Stack.Screen name="FollowingList" component={FollowingListScreen} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="Kyc" component={KycScreen} />
        <Stack.Screen name="KycDocUpload" component={KycDocUploadScreen} />
        <Stack.Screen name="KycSelfie" component={KycSelfieScreen} />
        <Stack.Screen name="KycMismatch" component={KycMismatchScreen} />
        <Stack.Screen name="VerifyIdentity" component={VerifyIdentityScreen} />
        <Stack.Screen name="FavoriteItems" component={FavoriteItemsScreen} />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        <Stack.Screen name="Recharge" component={RechargeScreen} />
      </Stack.Navigator>
    </Suspense>
  );
}
