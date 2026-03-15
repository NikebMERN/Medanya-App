import React, { useEffect, useState } from "react";
import { View, InteractionManager, Platform } from "react-native";
import { initializeAds } from "./src/services/ads.service";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { StripeProviderWrapper } from "./src/components/StripeProviderWrapper";
import { useAuthStore } from "./src/store/auth.store";
import { useThemeStore } from "./src/store/theme.store";
import RootNavigator from "./src/navigation/RootNavigator";
import AppSplashScreen from "./src/components/AppSplashScreen";
import { env } from "./src/utils/env";
import { webAppContent, webRootContainer } from "./src/theme/webLayout";

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

  const isWeb = Platform.OS === "web";

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const styleId = "medanya-web-root-styles";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `html,body,#root{margin:0;padding:0;width:100%;min-height:100vh;box-sizing:border-box}#root{display:flex;justify-content:center;align-items:flex-start;background:#f2f6ff}*{box-sizing:border-box}`;
    document.head.appendChild(style);
  }, []);

  return (
    <GestureHandlerRootView style={[{ flex: 1 }, isWeb && { ...webRootContainer, width: "100%", maxWidth: 480, backgroundColor: "#f2f6ff" }]}>
      <View style={[{ flex: 1 }, isWeb && webAppContent]}>
      <SafeAreaProvider style={{ flex: 1 }}>
        <StripeProviderWrapper publishableKey={stripePublishableKey} merchantIdentifier="merchant.com.medanya.app">
          <QueryClientProvider client={queryClient}>
            <StatusBar style={theme === "dark" ? "light" : "dark"} />
            <RootNavigator />
          </QueryClientProvider>
        </StripeProviderWrapper>
      </SafeAreaProvider>
      </View>
      {(!ready || !splashDone) && (
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "#f2f6ff", zIndex: 9999 }}>
          <StatusBar style="dark" />
          <AppSplashScreen logoSource={SPLASH_LOGO} />
        </View>
      )}
    </GestureHandlerRootView>
  );
}
