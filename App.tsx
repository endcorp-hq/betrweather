// Polyfills
import "./src/polyfills";

import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  ConnectionProvider,
  ToastProvider,
  TimezoneProvider,
  ChainProvider,
} from "@/contexts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppNavigator } from "./src/navigators/AppNavigator";
import { ShortxProvider } from "./src/hooks/solana";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";

import "./global.css";
import "react-native-reanimated";

const queryClient = new QueryClient();

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <QueryClientProvider client={queryClient}>
        <ChainProvider>
        <ConnectionProvider config={{ commitment: "processed" }}>
          <ShortxProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <SafeAreaProvider>
                <ToastProvider>
                  <TimezoneProvider>
                    <AppNavigator />
                  </TimezoneProvider>
                </ToastProvider>
              </SafeAreaProvider>
            </GestureHandlerRootView>
            </ShortxProvider>
          </ConnectionProvider>
        </ChainProvider>
      </QueryClientProvider>
    </View>
  );
}
