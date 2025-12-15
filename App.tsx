// Polyfills
import "./src/polyfills";

import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  ConnectionProvider,
  ToastProvider,
  TimezoneProvider,
  TemperatureUnitProvider,
  ChainProvider,
  MarketsProvider,
  PositionsProvider,
} from "@/contexts";
import { Chain, PrivyProvider } from "@privy-io/expo";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppNavigator } from "./src/navigators/AppNavigator";
import { ShortxProvider } from "./src/hooks/solana";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { Asset } from "expo-asset";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { PrivyElements } from "@privy-io/expo/ui";
import "./global.css";
import "react-native-reanimated";
import LogRocket from "@logrocket/react-native";
import * as Updates from "expo-updates";

// Keep the splash screen visible while we preload resources
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    LogRocket.init("rgqpme/betrweather", {
      updateId: Updates.isEmbeddedLaunch ? null : Updates.updateId,
      expoChannel: Updates.channel,
    });
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

  const solana: Chain = {
    id: 1,
    name: "Solana",
    nativeCurrency: {
      name: "Solana",
      symbol: "SOL",
      decimals: 9,
    },
    rpcUrls: {
      default: { http: ["https://api.mainnet-beta.solana.com"] },
      ws: { http: ["wss://api.mainnet-beta.solana.com"] },
    },
    testnet: false,
  };

  const supportedChains: [Chain, ...Chain[]] = [solana];

  return (
    <View style={{ flex: 1 }}>
      <ToastProvider>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <QueryClientProvider client={queryClient}>
        <PrivyProvider
                appId="cmio2um0t0047jp0bya178xuu"
                clientId="client-WY6TNuvrhUXFejaXaSCSWW9NzB26NpitKhh9pdABuH5e6"
                supportedChains={supportedChains}
                config={{
                  embedded: {
                    solana: {
                      createOnLogin: "users-without-wallets",
                    },
                  },
                }}
              >
          <ChainProvider>
            <ConnectionProvider config={{ commitment: "processed" }}>
             
                <ShortxProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <SafeAreaProvider>
                      <TimezoneProvider>
                        <TemperatureUnitProvider>
                          <MarketsProvider>
                            <PositionsProvider>
                              <PrivyElements />
                              <AppNavigator />
                            </PositionsProvider>
                          </MarketsProvider>
                        </TemperatureUnitProvider>
                      </TimezoneProvider>
                    </SafeAreaProvider>
                  </GestureHandlerRootView>
                </ShortxProvider>
          
            </ConnectionProvider>
          </ChainProvider>
          </PrivyProvider>
        </QueryClientProvider>
      </ToastProvider>
    </View>
  );
}
