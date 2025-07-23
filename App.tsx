// Polyfills
import "./src/polyfills";

import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";
import { ConnectionProvider } from "./src/utils/ConnectionProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppNavigator } from "./src/navigators/AppNavigator";
import { ClusterProvider } from "./src/components/cluster/cluster-data-access";
import { ShortxProvider } from "./src/solana/useContract";
import "./global.css";
import { Toaster } from "sonner-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View } from "react-native";
import { WeatherProvider } from "./src/components/ui/ScreenWrappers/WeatherBg";
import { StatusBar } from "expo-status-bar";
import { ToastProvider } from "./src/components/ui/ToastProvider";

const queryClient = new QueryClient();

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <QueryClientProvider client={queryClient}>
        <ClusterProvider>
          <ConnectionProvider config={{ commitment: "processed" }}>
            <ShortxProvider>
              <WeatherProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <SafeAreaProvider>
                    <ToastProvider>
                    <AppNavigator />
                    <Toaster richColors />
                    </ToastProvider>
                  </SafeAreaProvider>
                </GestureHandlerRootView>
              </WeatherProvider>
            </ShortxProvider>
          </ConnectionProvider>
        </ClusterProvider>
      </QueryClientProvider>
    </View>
  );
}
