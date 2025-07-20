// Polyfills
import "./src/polyfills";

import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import "react-native-reanimated";
import { ConnectionProvider } from "./src/utils/ConnectionProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppNavigator } from "./src/navigators/AppNavigator";
import { ClusterProvider } from "./src/components/cluster/cluster-data-access";
import { ShortxProvider } from "./src/solana/useContract";
import "./global.css";
import { Toaster } from "sonner-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { WeatherBackgroundSkia } from "./src/components/ui/WeatherBackgroundSkia";
import theme from "./src/theme";
import { View } from "react-native";
import { WeatherProvider } from "./src/components/ui/ScreenWrapper";

const queryClient = new QueryClient();

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      {/* Main app content */}
      <View style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <ClusterProvider>
            <ConnectionProvider config={{ commitment: "processed" }}>
              <ShortxProvider>
              <WeatherProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <SafeAreaProvider>
                    <SafeAreaView className="flex-1 bg-transparent">
                      <AppNavigator />
                      <Toaster richColors />
                    </SafeAreaView>
                  </SafeAreaProvider>
                </GestureHandlerRootView>
                </WeatherProvider>
              </ShortxProvider>
            </ConnectionProvider>
          </ClusterProvider>
        </QueryClientProvider>
      </View>
    </View>
  );
}
