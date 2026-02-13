import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "./src/store/auth.store";
import { useThemeStore } from "./src/store/theme.store";
import RootNavigator from "./src/navigation/RootNavigator";
import AppSplashScreen from "./src/components/AppSplashScreen";

// Use your logo for the in-app splash (shown for 3–4 s). Native splash uses splash-icon.png from app.json.
const SPLASH_LOGO = require("./assets/logo.jpeg");

// Keep native splash visible until we call hideAsync (call as early as possible)
SplashScreen.preventAutoHideAsync().catch(() => {});

const SPLASH_MIN_MS = 3500;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 60 * 1000 },
  },
});

export default function App() {
  const rehydrate = useAuthStore((s) => s.rehydrate);
  const rehydrateTheme = useThemeStore((s) => s.rehydrate);
  const theme = useThemeStore((s) => s.theme);
  const [ready, setReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await SplashScreen.preventAutoHideAsync();
      } catch (_) {
        // Native splash may not be available (e.g. web, some Expo Go)
      }
      await rehydrateTheme();
      await rehydrate();
      setReady(true);
    })();
  }, [rehydrate, rehydrateTheme]);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      setSplashDone(true);
      SplashScreen.hideAsync().catch(() => {});
    }, SPLASH_MIN_MS);
    return () => clearTimeout(t);
  }, [ready]);

  if (!ready || !splashDone) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f2f6ff" }}>
        <StatusBar style="dark" />
        <AppSplashScreen logoSource={SPLASH_LOGO} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={theme === "dark" ? "light" : "dark"} />
          <RootNavigator />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
