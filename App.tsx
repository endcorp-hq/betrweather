// Polyfills
import "./src/polyfills";

import { SafeAreaProvider } from "react-native-safe-area-context";
import { ConnectionProvider } from "./src/utils/ConnectionProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppNavigator } from "./src/navigators/AppNavigator";
import { ShortxProvider } from "./src/solana/useContract";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ToastProvider } from "./src/components/ui/ToastProvider";

import "./global.css";
import "react-native-reanimated";
import { TimezoneProvider } from "./src/contexts/TimezoneContext";

const queryClient = new QueryClient();

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </View>
  );
}
