import React, { useEffect, useState } from "react";
import { View, InteractionManager } from "react-native";
import { initializeAds } from "./src/services/ads.service";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { StripeProvider } from "@stripe/stripe-react-native";
import { useAuthStore } from "./src/store/auth.store";
import { useThemeStore } from "./src/store/theme.store";
import RootNavigator from "./src/navigation/RootNavigator";
import AppSplashScreen from "./src/components/AppSplashScreen";
import { env } from "./src/utils/env";

// Use your logo for the in-app splash (shown for 3–4 s). Native splash uses splash-icon.png from app.json.
const SPLASH_LOGO = require("./assets/logo.jpeg");

// Keep native splash visible until we call hideAsync (call as early as possible)
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 2 * 60 * 1000, gcTime: 5 * 60 * 1000 },
  },
});

export default function App() {
  const rehydrate = useAuthStore((s) => s.rehydrate);
  const rehydrateTheme = useThemeStore((s) => s.rehydrate);
  const theme = useThemeStore((s) => s.theme);
  const [ready, setReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      (async () => {
        try {
          await SplashScreen.preventAutoHideAsync();
        } catch (_) {}
        await rehydrateTheme();
        await rehydrate();
        initializeAds().catch(() => {});
        if (!cancelled) setReady(true);
      })();
    });
    return () => {
      cancelled = true;
      task.cancel?.();
    };
  }, [rehydrate, rehydrateTheme]);

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
    setSplashDone(true);
  }, [ready]);

  const stripeKey = env.stripePublishableKey || "";
  const stripePublishableKey = stripeKey && stripeKey.startsWith("pk_") ? stripeKey : "pk_test_placeholder";

  // Render full app immediately so it can mount and preload; splash overlay stays on top until ready.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StripeProvider publishableKey={stripePublishableKey} merchantIdentifier="merchant.com.medanya.app">
          <QueryClientProvider client={queryClient}>
            <StatusBar style={theme === "dark" ? "light" : "dark"} />
            <RootNavigator />
          </QueryClientProvider>
        </StripeProvider>
      </SafeAreaProvider>
      {(!ready || !splashDone) && (
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "#f2f6ff", zIndex: 9999 }}>
          <StatusBar style="dark" />
          <AppSplashScreen logoSource={SPLASH_LOGO} />
        </View>
      )}
    </GestureHandlerRootView>
  );
}
