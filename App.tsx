// Polyfills
import "./src/polyfills";

import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  ConnectionProvider,
  ToastProvider,
  TimezoneProvider,
  ChainProvider,
  MarketsProvider,
  PositionsProvider,
} from "@/contexts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppNavigator } from "./src/navigators/AppNavigator";
import { ShortxProvider } from "./src/hooks/solana";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { Asset } from "expo-asset";

import "./global.css";
import "react-native-reanimated";

// Keep the splash screen visible while we preload resources
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Preload frequently used image assets
        await Asset.loadAsync([
          require("./assets/logo/betrCloud_whitebg.png"),
          require("./assets/wxmlogo.png"),
        ]);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Asset preload failed", e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <ToastProvider>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <QueryClientProvider client={queryClient}>
          <ChainProvider>
            <ConnectionProvider config={{ commitment: "processed" }}>
              <ShortxProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <SafeAreaProvider>
                    <TimezoneProvider>
                      <MarketsProvider>
                        <PositionsProvider>
                          <AppNavigator />
                        </PositionsProvider>
                      </MarketsProvider>
                    </TimezoneProvider>
                  </SafeAreaProvider>
                </GestureHandlerRootView>
              </ShortxProvider>
            </ConnectionProvider>
          </ChainProvider>
        </QueryClientProvider>
      </ToastProvider>
    </View>
  );
}
