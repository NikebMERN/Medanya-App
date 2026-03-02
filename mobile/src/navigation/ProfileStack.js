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
const InsightsScreen = React.lazy(() => import("../screens/profile/InsightsScreen"));
const FavoriteItemsScreen = React.lazy(() => import("../screens/marketplace/FavoriteItemsScreen"));
const WalletHomeScreen = React.lazy(() => import("../modules/wallet/screens/WalletHomeScreen"));
const WalletHistoryScreen = React.lazy(() => import("../modules/wallet/screens/WalletHistoryScreen"));
const EarnCoinsScreen = React.lazy(() => import("../modules/wallet/screens/EarnCoinsScreen"));
import ReferralScreen from "../modules/wallet/screens/ReferralScreen";
const WithdrawScreen = React.lazy(() => import("../modules/wallet/screens/WithdrawScreen"));
const RechargeScreen = React.lazy(() => import("../screens/wallet/RechargeScreen"));
const NotificationsScreen = React.lazy(() => import("../screens/profile/NotificationsScreen"));
const PayoutSetupScreen = React.lazy(() => import("../screens/profile/PayoutSetupScreen"));

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
        <Stack.Screen name="Insights" component={InsightsScreen} />
        <Stack.Screen name="FavoriteItems" component={FavoriteItemsScreen} />
        <Stack.Screen name="Wallet" component={WalletHomeScreen} />
        <Stack.Screen name="WalletHistory" component={WalletHistoryScreen} />
        <Stack.Screen name="EarnCoins" component={EarnCoinsScreen} />
        <Stack.Screen name="Referral" component={ReferralScreen} options={{ animation: "none" }} />
        <Stack.Screen name="Withdraw" component={WithdrawScreen} />
        <Stack.Screen name="Recharge" component={RechargeScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="PayoutSetup" component={PayoutSetupScreen} />
      </Stack.Navigator>
    </Suspense>
  );
}
