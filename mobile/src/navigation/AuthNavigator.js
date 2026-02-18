import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LandingScreen from "../screens/auth/LandingScreen";
import PhoneScreen from "../screens/auth/PhoneScreen";
import OtpScreen from "../screens/auth/OtpScreen";
import ProfileCreationScreen from "../screens/auth/ProfileCreationScreen";

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#f8fafc" },
      }}
    >
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Phone" component={PhoneScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="ProfileCreation" component={ProfileCreationScreen} />
    </Stack.Navigator>
  );
}
